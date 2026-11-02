"""
===============================================================================
PROYECTO: Cloud Diagnostix — AWS Cloud Suite Backend
MÓDULO: app/api/v1/endpoints/proposals.py
CAPA ARQUITECTÓNICA: API v1 (Gestión de Propuestas Cloud y Ficha Técnica PDF)
DESCRIPCIÓN:
    Implementa el CRUD completo de `/api/v1/proposals` y la exportación del
    reporte PDF A4 de Ficha Técnica REA (`/api/v1/proposals/{id}/tech-sheet/pdf`).
INTEGRACIÓN FRONTEND / BD:
    - Frontend: AwsPlanning.tsx y AwsReaTechSheetModal.tsx
    - Base de Datos: Tablas `cloud_proposals`, `proposal_rea_evaluations`,
      `proposal_security_controls`, `cost_simulation_items`, `architecture_diagrams`
    - Referencia Contexto: context_backend/02_CONTRATOS_API_REST_ENDPOINTS.md
===============================================================================
"""

from typing import Any, Dict, List
from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.cost_item import CostSimulationItem
from app.models.diagram import ArchitectureDiagram
from app.models.proposal import CloudProposal
from app.models.rea_evaluation import ProposalReaEvaluation
from app.models.security_control import ProposalSecurityControl
from app.schemas.proposal_schema import ProposalCreateRequest, ProposalUpdateRequest
from app.services.drawio_aws4_builder import build_reactflow_graph, generate_proposal_drawio_xml
from app.services.iam_security_scorer import evaluate_iam_security_controls
from app.services.pdf_tech_sheet import generate_rea_tech_sheet_pdf
from app.services.pricing_calculator import build_finops_simulation_rows
from app.services.rea_engine import build_rea_evaluation

router = APIRouter(prefix="/proposals", tags=["Propuestas Cloud & Ficha Técnica REA"])


# ==========================================================
# 1. SERIALIZADOR HÍBRIDO (SNAKE_CASE + CAMELCASE PARA FRONTEND)
# ==========================================================
def serialize_proposal(proposal: CloudProposal) -> Dict[str, Any]:
    """
    Transforma una instancia ORM `CloudProposal` y sus relaciones (`rea_evaluation`,
    `security_controls`, `cost_items`) en un diccionario JSON que expone tanto
    claves `snake_case` como `camelCase` para compatibilidad total con React.
    """
    rea_dict = None
    if proposal.rea_evaluation:
        r = proposal.rea_evaluation
        rea_dict = {
            "id": r.id,
            "status": r.status,
            "origin_detected": r.origin_detected,
            "detected_configs": r.detected_configs,
            "system_analysis": r.system_analysis,
            "architecture_pattern": r.architecture_pattern,
            "migration_strategy": r.migration_strategy,
            "well_architected_notes": r.well_architected_notes,
            "technical_evidence": r.technical_evidence,
            "scenarios": r.scenarios,
            "ai_generated": bool(getattr(r, "ai_generated", False)),
            "ai_provider": getattr(r, "ai_provider", None),
            "evaluated_at": r.evaluated_at.isoformat() if r.evaluated_at else None,
        }

    sec_dict = None
    if proposal.security_controls:
        s = proposal.security_controls
        eval_sec = evaluate_iam_security_controls(
            {
                "rootBlocked": s.root_blocked,
                "mfaEnforced": s.mfa_enforced,
                "ec2Roles": s.ec2_roles,
                "tls13": s.tls_13,
                "s3EncryptionAndVersioning": s.s3_encryption_and_versioning,
                "complianceAudits": s.compliance_audits,
            },
            proposal.selected_services,
        )
        sec_dict = {
            "id": s.id,
            **eval_sec,
        }

    cost_list = [
        {
            "id": c.id,
            "service_id": c.service_id,
            "service_name": c.service_name,
            "service_code": c.service_code,
            "category": c.category,
            "instance_type_or_tier": c.instance_type_or_tier,
            "quantity": c.quantity,
            "hours_per_month": c.hours_per_month,
            "unit": c.unit,
            "unit_price": c.unit_price,
            "cost_per_hour": c.cost_per_hour,
            "monthly_cost": c.monthly_cost,
            "annual_cost": c.annual_cost,
        }
        for c in proposal.cost_items
    ]

    return {
        "id": proposal.id,
        "user_id": proposal.user_id,
        "solution_name": proposal.solution_name,
        "solutionName": proposal.solution_name,
        "app_type": proposal.app_type,
        "appType": proposal.app_type,
        "description": proposal.description,
        "region": proposal.region,
        "estimated_users": proposal.estimated_users,
        "estimatedUsers": proposal.estimated_users,
        "availability_level": proposal.availability_level,
        "availabilityLevel": proposal.availability_level,
        "selected_services": proposal.selected_services,
        "selectedServices": proposal.selected_services,
        "migration_goal": proposal.migration_goal,
        "migrationGoal": proposal.migration_goal,
        "monthly_budget": proposal.monthly_budget,
        "monthlyBudget": proposal.monthly_budget,
        "annual_budget": proposal.annual_budget,
        "annualBudget": proposal.annual_budget,
        "status": proposal.status,
        "applied_scenario": proposal.applied_scenario,
        "appliedScenario": proposal.applied_scenario,
        "is_active": proposal.is_active,
        "isActive": proposal.is_active,
        "rea_evaluation": rea_dict,
        "reaEvaluation": rea_dict,
        "security_controls": sec_dict,
        "securityControls": sec_dict,
        "cost_items": cost_list,
        "costItems": cost_list,
        "created_at": proposal.created_at.isoformat() if proposal.created_at else None,
        "updated_at": proposal.updated_at.isoformat() if proposal.updated_at else None,
    }


# ==========================================================
# 2. ENDPOINTS CRUD DE PROPUESTAS (`/api/v1/proposals`)
# ==========================================================
@router.get(
    "",
    summary="Lista todas las propuestas de arquitectura registradas con su Ficha REA y Seguridad IAM",
)
async def list_proposals(db: Session = Depends(get_db)) -> List[Dict[str, Any]]:
    """Devuelve todas las propuestas ordenadas de la más reciente a la más antigua."""
    proposals = db.query(CloudProposal).order_by(CloudProposal.created_at.desc()).all()
    return [serialize_proposal(p) for p in proposals]


@router.post(
    "",
    status_code=status.HTTP_201_CREATED,
    summary="Crea una nueva propuesta cloud junto con su evaluación REA, controles IAM y diagrama AWS4",
)
async def create_proposal(
    payload: ProposalCreateRequest,
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    """
    Registra en cascada:
    1. La propuesta en `cloud_proposals`.
    2. Su evaluación técnica en `proposal_rea_evaluations`.
    3. Sus 6 controles de seguridad IAM en `proposal_security_controls`.
    4. Su desglose FinOps en `cost_simulation_items`.
    5. Su diagrama Draw.io oficial `mxgraph.aws4` en `architecture_diagrams`.
    """
    rea_eval = payload.rea_evaluation or build_rea_evaluation(
        source_name=payload.solution_name,
        evidence={
            "languages": [],
            "frameworks": [payload.app_type] if payload.app_type else [],
            "databases": [],
            "has_docker": "ECS" in payload.selected_services,
            "total_files": 0,
            "detected_configs": [],
        },
        traffic_tier=payload.traffic_tier,
        target_region=payload.region,
    )

    # Extraer presupuesto del escenario recomendado si no fue enviado explícitamente
    rec_monthly = 310.95
    for sc in rea_eval.get("scenarios", []):
        if sc.get("scenario_type") == payload.applied_scenario:
            rec_monthly = float(sc.get("pricing", {}).get("monthly_total_usd", 310.95))
            break

    monthly_budget = payload.monthly_budget if payload.monthly_budget is not None else rec_monthly
    annual_budget = payload.annual_budget if payload.annual_budget is not None else round(monthly_budget * 12, 2)

    proposal = CloudProposal(
        solution_name=payload.solution_name,
        app_type=payload.app_type,
        description=payload.description,
        region=payload.region,
        estimated_users=payload.estimated_users,
        availability_level=payload.availability_level,
        selected_services=payload.selected_services,
        migration_goal=payload.migration_goal,
        monthly_budget=monthly_budget,
        annual_budget=annual_budget,
        status=payload.status,
        applied_scenario=payload.applied_scenario,
        is_active=payload.is_active,
    )
    db.add(proposal)
    db.flush()

    # Persistir Ficha Técnica REA
    rea_row = ProposalReaEvaluation(
        proposal_id=proposal.id,
        status=rea_eval.get("status", "success"),
        origin_detected=rea_eval.get("origin_detected", f"Proyecto ({payload.solution_name})"),
        detected_configs=rea_eval.get("detected_configs", []),
        system_analysis=rea_eval.get("system_analysis", payload.description),
        architecture_pattern=rea_eval.get(
            "architecture_pattern",
            "Arquitectura Web Empresarial Multi-Capa (3-Tier High Availability)",
        ),
        migration_strategy=rea_eval.get("migration_strategy", "Replatform (Lift, Tinker & Shift)"),
        well_architected_notes=rea_eval.get("well_architected_notes", []),
        technical_evidence=rea_eval.get("technical_evidence", {}),
        ai_generated=bool(rea_eval.get("ai_generated", False)),
        ai_provider=rea_eval.get("ai_provider"),
        scenarios=rea_eval.get("scenarios", []),
    )
    db.add(rea_row)

    # Persistir Controles de Seguridad IAM (0-100 pts)
    sec_input = payload.security_controls.model_dump() if payload.security_controls else {}
    sec_eval = evaluate_iam_security_controls(sec_input, payload.selected_services)
    sec_row = ProposalSecurityControl(
        proposal_id=proposal.id,
        root_blocked=sec_eval["rootBlocked"],
        mfa_enforced=sec_eval["mfaEnforced"],
        ec2_roles=sec_eval["ec2Roles"],
        tls_13=sec_eval["tls13"],
        s3_encryption_and_versioning=sec_eval["s3EncryptionAndVersioning"],
        compliance_audits=sec_eval["complianceAudits"],
        security_score=sec_eval["security_score"],
        posture_label=sec_eval["posture_label"],
    )
    db.add(sec_row)

    # Persistir ítems FinOps sobre 730 horas/mes
    for item_dict in build_finops_simulation_rows(payload.selected_services, payload.traffic_tier):
        db.add(CostSimulationItem(proposal_id=proposal.id, **item_dict))

    # Persistir diagrama inicial Draw.io AWS4
    xml_diagram = generate_proposal_drawio_xml(
        proposal_name=proposal.solution_name,
        region=proposal.region,
        selected_services=proposal.selected_services,
        architecture_pattern=rea_row.architecture_pattern,
        rea_evaluation=rea_eval,
        applied_scenario=proposal.applied_scenario or "Recommended-Production",
    )
    reactflow_graph = build_reactflow_graph(
        proposal_name=proposal.solution_name,
        region=proposal.region,
        selected_services=proposal.selected_services,
        rea_evaluation=rea_eval,
        applied_scenario=proposal.applied_scenario or "Recommended-Production",
    )
    db.add(
        ArchitectureDiagram(
            proposal_id=proposal.id,
            diagram_type="drawio_aws4",
            drawio_xml=xml_diagram,
            reactflow_graph=reactflow_graph,
            region_snapshot=proposal.region,
        )
    )

    db.commit()
    db.refresh(proposal)
    return serialize_proposal(proposal)


@router.get(
    "/{proposal_id}",
    summary="Obtiene el detalle completo de una propuesta por su ID",
)
async def get_proposal_by_id(
    proposal_id: str,
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    """Retorna la propuesta junto con su evaluación REA, seguridad IAM y costos."""
    proposal = db.query(CloudProposal).filter(CloudProposal.id == proposal_id).first()
    if not proposal:
        raise HTTPException(status_code=404, detail=f"Propuesta '{proposal_id}' no encontrada.")
    return serialize_proposal(proposal)


@router.put(
    "/{proposal_id}",
    summary="Actualiza una propuesta existente (servicios, región, SLA, presupuesto o controles IAM)",
)
async def update_proposal(
    proposal_id: str,
    payload: ProposalUpdateRequest,
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    """Actualiza los campos enviados y recalcula automáticamente el puntaje de seguridad IAM."""
    proposal = db.query(CloudProposal).filter(CloudProposal.id == proposal_id).first()
    if not proposal:
        raise HTTPException(status_code=404, detail=f"Propuesta '{proposal_id}' no encontrada.")

    architecture_changed = any(
        value is not None
        for value in (
            payload.solution_name,
            payload.region,
            payload.selected_services,
            payload.applied_scenario,
            payload.rea_evaluation,
        )
    )

    if payload.solution_name is not None:
        proposal.solution_name = payload.solution_name
    if payload.app_type is not None:
        proposal.app_type = payload.app_type
    if payload.description is not None:
        proposal.description = payload.description
    if payload.region is not None:
        proposal.region = payload.region
    if payload.estimated_users is not None:
        proposal.estimated_users = payload.estimated_users
    if payload.availability_level is not None:
        proposal.availability_level = payload.availability_level
    if payload.selected_services is not None:
        proposal.selected_services = payload.selected_services
    if payload.migration_goal is not None:
        proposal.migration_goal = payload.migration_goal
    if payload.monthly_budget is not None:
        proposal.monthly_budget = payload.monthly_budget
    if payload.annual_budget is not None:
        proposal.annual_budget = payload.annual_budget
    if payload.status is not None:
        proposal.status = payload.status
    if payload.applied_scenario is not None:
        proposal.applied_scenario = payload.applied_scenario
    if payload.is_active is not None:
        proposal.is_active = payload.is_active

    if payload.rea_evaluation is not None:
        rea_data = payload.rea_evaluation
        rea_row = proposal.rea_evaluation
        if rea_row:
            rea_row.status = rea_data.get("status", rea_row.status)
            rea_row.origin_detected = rea_data.get("origin_detected", rea_row.origin_detected)
            rea_row.detected_configs = rea_data.get("detected_configs", rea_row.detected_configs or [])
            rea_row.system_analysis = rea_data.get("system_analysis", rea_row.system_analysis)
            rea_row.architecture_pattern = rea_data.get("architecture_pattern", rea_row.architecture_pattern)
            rea_row.migration_strategy = rea_data.get("migration_strategy", rea_row.migration_strategy)
            rea_row.well_architected_notes = rea_data.get("well_architected_notes", rea_row.well_architected_notes or [])
            rea_row.technical_evidence = rea_data.get("technical_evidence", rea_row.technical_evidence or {})
            rea_row.ai_generated = bool(rea_data.get("ai_generated", False))
            rea_row.ai_provider = rea_data.get("ai_provider")
            rea_row.scenarios = rea_data.get("scenarios", rea_row.scenarios or [])

    if architecture_changed:
        diagram = (
            db.query(ArchitectureDiagram)
            .filter(
                ArchitectureDiagram.proposal_id == proposal.id,
                ArchitectureDiagram.diagram_type == "drawio_aws4",
            )
            .first()
        )
        if diagram:
            rea = proposal.rea_evaluation
            rea_data = {
                "origin_detected": rea.origin_detected,
                "architecture_pattern": rea.architecture_pattern,
                "migration_strategy": rea.migration_strategy,
                "scenarios": rea.scenarios,
                "ai_generated": bool(getattr(rea, "ai_generated", False)),
                "ai_provider": getattr(rea, "ai_provider", None),
            } if rea else {}
            diagram.drawio_xml = generate_proposal_drawio_xml(
                proposal_name=proposal.solution_name,
                region=proposal.region,
                selected_services=proposal.selected_services,
                architecture_pattern=rea_data.get("architecture_pattern") or "Arquitectura pendiente de evaluación REA",
                rea_evaluation=rea_data,
                applied_scenario=proposal.applied_scenario or "Recommended-Production",
            )
            diagram.reactflow_graph = build_reactflow_graph(
                proposal_name=proposal.solution_name,
                region=proposal.region,
                selected_services=proposal.selected_services,
                rea_evaluation=rea_data,
                applied_scenario=proposal.applied_scenario or "Recommended-Production",
            )

    # Recalcular postura de seguridad IAM si cambiaron los controles o los servicios (EC2/S3)
    if proposal.security_controls:
        sec_input = (
            payload.security_controls.model_dump()
            if payload.security_controls
            else {
                "rootBlocked": proposal.security_controls.root_blocked,
                "mfaEnforced": proposal.security_controls.mfa_enforced,
                "ec2Roles": proposal.security_controls.ec2_roles,
                "tls13": proposal.security_controls.tls_13,
                "s3EncryptionAndVersioning": proposal.security_controls.s3_encryption_and_versioning,
                "complianceAudits": proposal.security_controls.compliance_audits,
            }
        )
        sec_eval = evaluate_iam_security_controls(sec_input, proposal.selected_services)
        proposal.security_controls.root_blocked = sec_eval["rootBlocked"]
        proposal.security_controls.mfa_enforced = sec_eval["mfaEnforced"]
        proposal.security_controls.ec2_roles = sec_eval["ec2Roles"]
        proposal.security_controls.tls_13 = sec_eval["tls13"]
        proposal.security_controls.s3_encryption_and_versioning = sec_eval["s3EncryptionAndVersioning"]
        proposal.security_controls.compliance_audits = sec_eval["complianceAudits"]
        proposal.security_controls.security_score = sec_eval["security_score"]
        proposal.security_controls.posture_label = sec_eval["posture_label"]

    db.commit()
    db.refresh(proposal)
    return serialize_proposal(proposal)


@router.delete(
    "/{proposal_id}",
    summary="Elimina una propuesta registrada y sus entidades asociadas en cascada",
)
async def delete_proposal(
    proposal_id: str,
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    """Elimina la propuesta de `cloud_proposals`."""
    proposal = db.query(CloudProposal).filter(CloudProposal.id == proposal_id).first()
    if not proposal:
        raise HTTPException(status_code=404, detail=f"Propuesta '{proposal_id}' no encontrada.")
    db.delete(proposal)
    db.commit()
    return {"deleted": True, "id": proposal_id}


# ==========================================================
# 3. EXPORTACIÓN DE FICHA TÉCNICA REA EN PDF A4
# ==========================================================
@router.get(
    "/{proposal_id}/tech-sheet/pdf",
    summary="Genera y descarga el archivo PDF A4 de la Ficha Técnica REA y Seguridad IAM",
)
async def download_proposal_tech_sheet_pdf(
    proposal_id: str,
    db: Session = Depends(get_db),
) -> Response:
    """
    Construye al vuelo el documento PDF A4 oficial con los datos de la propuesta,
    el dictamen del Motor REA, los 3 escenarios FinOps y la matriz IAM (0-100 pts).
    """
    proposal = db.query(CloudProposal).filter(CloudProposal.id == proposal_id).first()
    if not proposal:
        raise HTTPException(status_code=404, detail=f"Propuesta '{proposal_id}' no encontrada.")

    serialized = serialize_proposal(proposal)
    pdf_bytes = generate_rea_tech_sheet_pdf(
        proposal_data=serialized,
        rea_data=serialized.get("rea_evaluation") or {},
        security_data=serialized.get("security_controls") or {},
    )
    safe_filename = f"Ficha_Tecnica_REA_{proposal.id[:8]}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{safe_filename}"',
        },
    )

