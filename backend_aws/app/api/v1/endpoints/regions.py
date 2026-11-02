"""
===============================================================================
PROYECTO: Cloud Diagnostix — AWS Cloud Suite Backend
MÓDULO: app/api/v1/endpoints/regions.py
CAPA ARQUITECTÓNICA: API v1 (Migración entre Regiones AWS y Bitácora Globo 3D)
DESCRIPCIÓN:
    Expone `POST /api/v1/proposals/{id}/migrate-region` para trasladar una
    propuesta de una región AWS a otra (ej. `sa-east-1` -> `us-east-1`),
    actualizando su diagrama AWS4 y registrando el evento en `region_migrations_log`.
INTEGRACIÓN FRONTEND / BD:
    - Frontend: Globo 3D de Regiones AWS y AwsPlanning.tsx
    - Base de Datos: Tabla `region_migrations_log`
    - Referencia Contexto: context_backend/02_CONTRATOS_API_REST_ENDPOINTS.md
===============================================================================
"""

from typing import Any, Dict, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.diagram import ArchitectureDiagram, RegionMigrationLog
from app.models.proposal import CloudProposal
from app.schemas.proposal_schema import RegionMigrateRequest
from app.services.drawio_aws4_builder import build_reactflow_graph, generate_proposal_drawio_xml

router = APIRouter(tags=["Regiones AWS & Bitácora Globo 3D"])

AWS_REGIONS_CATALOG: List[Dict[str, Any]] = [
    {"code": "sa-east-1", "name": "América del Sur (São Paulo)", "lat": -23.5505, "lng": -46.6333},
    {"code": "us-east-1", "name": "EE. UU. Este (Norte de Virginia)", "lat": 38.9072, "lng": -77.0369},
    {"code": "us-west-2", "name": "EE. UU. Oeste (Oregón)", "lat": 45.5152, "lng": -122.6784},
    {"code": "eu-west-1", "name": "Europa (Irlanda)", "lat": 53.3498, "lng": -6.2603},
    {"code": "eu-central-1", "name": "Europa (Fráncfort)", "lat": 50.1109, "lng": 8.6821},
    {"code": "ap-northeast-1", "name": "Asia Pacífico (Tokio)", "lat": 35.6762, "lng": 139.6503},
]


# ==========================================================
# 1. CATÁLOGO DE REGIONES Y MIGRACIÓN REGIONAL DE PROPUESTA
# ==========================================================
@router.get(
    "/regions",
    summary="Lista las regiones globales de AWS soportadas en el Globo 3D",
)
async def list_aws_regions() -> List[Dict[str, Any]]:
    """Devuelve las regiones oficiales de AWS con sus coordenadas geográficas."""
    return AWS_REGIONS_CATALOG


@router.post(
    "/proposals/{proposal_id}/migrate-region",
    summary="Migra una propuesta a una nueva región AWS y registra la bitácora para el Globo 3D",
)
async def migrate_proposal_region(
    proposal_id: str,
    payload: RegionMigrateRequest,
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    """
    Actualiza `region` en `cloud_proposals`, registra el movimiento en
    `region_migrations_log` y regenera el contenedor de región del diagrama Draw.io.
    """
    proposal = db.query(CloudProposal).filter(CloudProposal.id == proposal_id).first()
    if not proposal:
        raise HTTPException(status_code=404, detail=f"Propuesta '{proposal_id}' no encontrada.")

    previous_region = payload.from_region or proposal.region
    target_region = payload.to_region.strip()
    services_migrated = payload.migrated_services or proposal.selected_services

    proposal.region = target_region

    log_entry = RegionMigrationLog(
        proposal_id=proposal.id,
        from_region=previous_region,
        to_region=target_region,
        migrated_services=services_migrated,
    )
    db.add(log_entry)

    # Sincronizar el snapshot de región en el diagrama Draw.io AWS4
    diag = (
        db.query(ArchitectureDiagram)
        .filter(
            ArchitectureDiagram.proposal_id == proposal.id,
            ArchitectureDiagram.diagram_type == "drawio_aws4",
        )
        .first()
    )
    if diag:
        diag.region_snapshot = target_region
        rea = proposal.rea_evaluation
        rea_data = {
            "origin_detected": rea.origin_detected,
            "architecture_pattern": rea.architecture_pattern,
            "migration_strategy": rea.migration_strategy,
            "scenarios": rea.scenarios,
        } if rea else {}
        diag.drawio_xml = generate_proposal_drawio_xml(
            proposal_name=proposal.solution_name,
            region=target_region,
            selected_services=proposal.selected_services,
            architecture_pattern=rea_data.get("architecture_pattern") or "Arquitectura pendiente de evaluación REA",
            rea_evaluation=rea_data,
            applied_scenario=proposal.applied_scenario or "Recommended-Production",
        )
        diag.reactflow_graph = build_reactflow_graph(
            proposal_name=proposal.solution_name,
            region=target_region,
            selected_services=proposal.selected_services,
            rea_evaluation=rea_data,
            applied_scenario=proposal.applied_scenario or "Recommended-Production",
        )

    db.commit()
    db.refresh(log_entry)

    return {
        "status": "migrated",
        "proposal_id": proposal.id,
        "from_region": previous_region,
        "to_region": target_region,
        "migrated_services": services_migrated,
        "migrated_at": log_entry.migrated_at.isoformat() if log_entry.migrated_at else None,
    }

