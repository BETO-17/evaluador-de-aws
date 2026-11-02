"""
===============================================================================
PROYECTO: Cloud Diagnostix — AWS Cloud Suite Backend
MÓDULO: app/api/v1/endpoints/diagrams.py
CAPA ARQUITECTÓNICA: API v1 (Diagramas Draw.io con Stencils mxgraph.aws4)
DESCRIPCIÓN:
    Expone los endpoints `GET` y `PUT` `/api/v1/proposals/{id}/diagrams/drawio`
    para entregar el XML oficial con contenedores e iconos `mxgraph.aws4` y
    guardar las ediciones manuales realizadas en `AwsDrawioEditor.tsx`.
INTEGRACIÓN FRONTEND / BD:
    - Frontend: src/features/modules/aws-cloud/components/AwsDrawioEditor.tsx
    - Base de Datos: Tabla `architecture_diagrams`
    - Referencia Contexto: context_backend/02_CONTRATOS_API_REST_ENDPOINTS.md
===============================================================================
"""

from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.diagram import ArchitectureDiagram
from app.models.proposal import CloudProposal
from app.schemas.proposal_schema import DrawioDiagramUpdateRequest
from app.services.drawio_aws4_builder import (
    AWS4_STENCIL_CATALOG,
    build_reactflow_graph,
    generate_proposal_drawio_xml,
    validate_drawio_xml,
)

router = APIRouter(tags=["Diagramas Draw.io AWS4 & MCP"])


class DrawioPreviewRequest(BaseModel):
    """Solicitud para generar un XML Draw.io AWS4 al vuelo sin persistir."""

    proposal_name: str = "Arquitectura AWS Cloud Diagnostix"
    region: str = "sa-east-1"
    selected_services: Optional[List[str]] = None


def _rea_context(proposal: CloudProposal) -> Dict[str, Any]:
    rea = proposal.rea_evaluation
    if not rea:
        return {}
    return {
        "status": rea.status,
        "origin_detected": rea.origin_detected,
        "detected_configs": rea.detected_configs,
        "system_analysis": rea.system_analysis,
        "architecture_pattern": rea.architecture_pattern,
        "migration_strategy": rea.migration_strategy,
        "well_architected_notes": rea.well_architected_notes,
        "technical_evidence": rea.technical_evidence,
        "ai_generated": bool(getattr(rea, "ai_generated", False)),
        "ai_provider": getattr(rea, "ai_provider", None),
        "scenarios": rea.scenarios,
    }


# ==========================================================
# 1. OBTENCIÓN DEL DIAGRAMA DRAW.IO AWS4 DE UNA PROPUESTA (`GET`)
# ==========================================================
@router.get(
    "/proposals/{proposal_id}/diagrams/drawio",
    summary="Devuelve el XML de Draw.io con iconos oficiales mxgraph.aws4 de la propuesta",
)
async def get_proposal_drawio_diagram(
    proposal_id: str,
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    """
    Si la propuesta ya tiene un diagrama `drawio_aws4` persistido en la tabla
    `architecture_diagrams`, lo devuelve; de lo contrario, lo genera al vuelo
    usando los servicios y región de la propuesta.
    """
    proposal = db.query(CloudProposal).filter(CloudProposal.id == proposal_id).first()
    if not proposal:
        raise HTTPException(status_code=404, detail=f"Propuesta '{proposal_id}' no encontrada.")

    diag = (
        db.query(ArchitectureDiagram)
        .filter(
            ArchitectureDiagram.proposal_id == proposal.id,
            ArchitectureDiagram.diagram_type == "drawio_aws4",
        )
        .first()
    )

    rea_data = _rea_context(proposal)
    expected_services = set(proposal.selected_services or [])
    if not expected_services:
        selected_scenario = next(
            (item for item in (rea_data.get("scenarios") or []) if item.get("scenario_type") == (proposal.applied_scenario or "Recommended-Production")),
            {},
        )
        expected_services = {item.get("service_code") for item in selected_scenario.get("services", []) if item.get("service_code")}
    xml_services_missing = any(
        f'id="node_{service.replace(" ", "_")}"' not in (diag.drawio_xml or "")
        for service in expected_services
    )
    needs_rea_diagram = not diag or not diag.drawio_xml or "rea_evaluation_summary" not in diag.drawio_xml or xml_services_missing
    if needs_rea_diagram:
        xml_str = generate_proposal_drawio_xml(
            proposal_name=proposal.solution_name,
            region=proposal.region,
            selected_services=proposal.selected_services,
            architecture_pattern=rea_data.get("architecture_pattern") or "Arquitectura pendiente de evaluación REA",
            rea_evaluation=rea_data,
            applied_scenario=proposal.applied_scenario or "Recommended-Production",
        )
        if not diag:
            diag = ArchitectureDiagram(
                proposal_id=proposal.id,
                diagram_type="drawio_aws4",
                drawio_xml=xml_str,
                region_snapshot=proposal.region,
            )
            db.add(diag)
        else:
            diag.drawio_xml = xml_str
            diag.region_snapshot = proposal.region
    graph_metadata = diag.reactflow_graph.get("metadata", {}) if isinstance(diag.reactflow_graph, dict) else {}
    graph_service_codes = {
        node.get("data", {}).get("serviceCode")
        for node in (diag.reactflow_graph or {}).get("nodes", [])
        if isinstance(node, dict) and isinstance(node.get("data"), dict)
    } if isinstance(diag.reactflow_graph, dict) else set()
    graph_needs_rea = (
        not diag.reactflow_graph
        or not graph_metadata.get("architecture_pattern")
        or not expected_services.issubset(graph_service_codes)
    )
    if graph_needs_rea:
        diag.reactflow_graph = build_reactflow_graph(
            proposal_name=proposal.solution_name,
            region=proposal.region,
            selected_services=proposal.selected_services,
            rea_evaluation=rea_data,
            applied_scenario=proposal.applied_scenario or "Recommended-Production",
        )
    db.commit()
    db.refresh(diag)

    return {
        "id": diag.id,
        "proposal_id": proposal.id,
        "diagram_type": diag.diagram_type,
        "region_snapshot": diag.region_snapshot,
        "drawio_xml": diag.drawio_xml,
        "drawioXml": diag.drawio_xml,
        "reactflow_graph": diag.reactflow_graph,
        "rea_evaluation": rea_data,
        "reaEvaluation": rea_data,
        "updated_at": diag.updated_at.isoformat() if diag.updated_at else None,
    }


# ==========================================================
# 2. GUARDADO DE CAMBIOS MANUALES EN EL EDITOR DRAW.IO (`PUT`)
# ==========================================================
@router.put(
    "/proposals/{proposal_id}/diagrams/drawio",
    summary="Guarda cambios manuales hechos por el usuario en el editor Draw.io",
)
async def save_proposal_drawio_diagram(
    proposal_id: str,
    payload: DrawioDiagramUpdateRequest,
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    """
    Valida que el XML enviado sea sintácticamente correcto y actualiza el
    registro `drawio_aws4` en `architecture_diagrams`.
    """
    proposal = db.query(CloudProposal).filter(CloudProposal.id == proposal_id).first()
    if not proposal:
        raise HTTPException(status_code=404, detail=f"Propuesta '{proposal_id}' no encontrada.")

    if payload.drawio_xml:
        validation = validate_drawio_xml(payload.drawio_xml)
    else:
        validation = {"valid": True}
    if not validation.get("valid"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=validation.get("error", "El XML de Draw.io proporcionado no es válido."),
        )

    diag = (
        db.query(ArchitectureDiagram)
        .filter(
            ArchitectureDiagram.proposal_id == proposal.id,
            ArchitectureDiagram.diagram_type == "drawio_aws4",
        )
        .first()
    )
    if not diag:
        diag = ArchitectureDiagram(
            proposal_id=proposal.id,
            diagram_type="drawio_aws4",
            region_snapshot=payload.region_snapshot or proposal.region,
        )
        db.add(diag)

    if payload.drawio_xml:
        diag.drawio_xml = payload.drawio_xml
    elif not diag.drawio_xml:
        rea_data = _rea_context(proposal)
        diag.drawio_xml = generate_proposal_drawio_xml(
            proposal_name=proposal.solution_name,
            region=proposal.region,
            selected_services=proposal.selected_services,
            architecture_pattern=rea_data.get("architecture_pattern") or "Arquitectura pendiente de evaluación REA",
            rea_evaluation=rea_data,
            applied_scenario=proposal.applied_scenario or "Recommended-Production",
        )
    diag.region_snapshot = payload.region_snapshot or proposal.region
    if payload.reactflow_graph is not None:
        diag.reactflow_graph = payload.reactflow_graph

    db.commit()
    db.refresh(diag)

    return {
        "saved": True,
        "id": diag.id,
        "proposal_id": proposal.id,
        "diagram_type": diag.diagram_type,
        "region_snapshot": diag.region_snapshot,
        "drawio_xml": diag.drawio_xml,
        "drawioXml": diag.drawio_xml,
        "reactflow_graph": diag.reactflow_graph,
        "updated_at": diag.updated_at.isoformat() if diag.updated_at else None,
    }


# ==========================================================
# 3. GENERACIÓN EN VIVO Y CATÁLOGO DE STENCILS MXGRAPH.AWS4
# ==========================================================
@router.post(
    "/diagrams/drawio/generate",
    summary="Genera un diagrama XML Draw.io con stencils mxgraph.aws4 al vuelo",
)
async def generate_drawio_preview(payload: DrawioPreviewRequest) -> Dict[str, Any]:
    """Permite generar el XML `mxgraph.aws4` para cualquier combinación de servicios."""
    xml_out = generate_proposal_drawio_xml(
        proposal_name=payload.proposal_name,
        region=payload.region,
        selected_services=payload.selected_services,
    )
    return {
        "proposal_name": payload.proposal_name,
        "region": payload.region,
        "drawio_xml": xml_out,
        "stencils_catalog_size": len(AWS4_STENCIL_CATALOG),
    }

