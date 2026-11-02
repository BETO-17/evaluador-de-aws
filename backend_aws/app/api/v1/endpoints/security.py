"""
===============================================================================
PROYECTO: Cloud Diagnostix — AWS Cloud Suite Backend
MÓDULO: app/api/v1/endpoints/security.py
CAPA ARQUITECTÓNICA: API v1 (Seguridad IAM por Proyecto de Migración 0-100 pts)
DESCRIPCIÓN:
    Expone los endpoints para consultar y actualizar (`PATCH`) los 6 controles
    de seguridad IAM de cada propuesta, recalculando el puntaje exacto de 0 a
    100 puntos y la clasificación ('Postura Robusta', 'Postura Aceptable',
    'Postura Crítica').
INTEGRACIÓN FRONTEND / BD:
    - Frontend: AwsPlanning.tsx y AwsReaTechSheetModal.tsx
    - Base de Datos: Tabla `proposal_security_controls`
    - Referencia Contexto: context_backend/04_SEGURIDAD_IAM_TOTP_Y_DIAGRAMAS_AWS4.md
===============================================================================
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.proposal import CloudProposal
from app.models.security_control import ProposalSecurityControl
from app.schemas.security_schema import SecurityControlsPayload, SecurityPostureResponse
from app.services.iam_security_scorer import evaluate_iam_security_controls

router = APIRouter(tags=["Seguridad IAM por Migración (0-100 pts)"])


# ==========================================================
# 1. ACTUALIZACIÓN DE CONTROLES IAM DE UNA PROPUESTA (`PATCH`)
# ==========================================================
@router.patch(
    "/proposals/{proposal_id}/security",
    response_model=SecurityPostureResponse,
    summary="Actualiza los 6 controles IAM de la propuesta y recalcula el puntaje 0-100",
)
async def update_proposal_security_controls(
    proposal_id: str,
    payload: SecurityControlsPayload,
    db: Session = Depends(get_db),
) -> SecurityPostureResponse:
    """
    Actualiza la matriz de controles IAM en `proposal_security_controls` y
    evalúa las condiciones condicionales (`EC2` para `ec2Roles` y `S3` para
    `s3EncryptionAndVersioning`).
    """
    proposal = db.query(CloudProposal).filter(CloudProposal.id == proposal_id).first()
    if not proposal:
        raise HTTPException(status_code=404, detail=f"Propuesta '{proposal_id}' no encontrada.")

    services = payload.selected_services if payload.selected_services is not None else proposal.selected_services
    evaluated = evaluate_iam_security_controls(payload.model_dump(), services)

    sec_row = proposal.security_controls
    if not sec_row:
        sec_row = ProposalSecurityControl(proposal_id=proposal.id)
        db.add(sec_row)

    sec_row.root_blocked = evaluated["rootBlocked"]
    sec_row.mfa_enforced = evaluated["mfaEnforced"]
    sec_row.ec2_roles = evaluated["ec2Roles"]
    sec_row.tls_13 = evaluated["tls13"]
    sec_row.s3_encryption_and_versioning = evaluated["s3EncryptionAndVersioning"]
    sec_row.compliance_audits = evaluated["complianceAudits"]
    sec_row.security_score = evaluated["security_score"]
    sec_row.posture_label = evaluated["posture_label"]

    db.commit()
    return SecurityPostureResponse(proposal_id=proposal.id, **evaluated)


# ==========================================================
# 2. CONSULTA Y EVALUACIÓN DIRECTA DE POSTURA IAM
# ==========================================================
@router.get(
    "/proposals/{proposal_id}/security",
    response_model=SecurityPostureResponse,
    summary="Obtiene la postura de seguridad IAM actual de una propuesta",
)
async def get_proposal_security_controls(
    proposal_id: str,
    db: Session = Depends(get_db),
) -> SecurityPostureResponse:
    """Devuelve los 6 controles IAM, el puntaje `0-100` y los roles recomendados."""
    proposal = db.query(CloudProposal).filter(CloudProposal.id == proposal_id).first()
    if not proposal:
        raise HTTPException(status_code=404, detail=f"Propuesta '{proposal_id}' no encontrada.")

    s = proposal.security_controls
    controls_dict = (
        {
            "rootBlocked": s.root_blocked,
            "mfaEnforced": s.mfa_enforced,
            "ec2Roles": s.ec2_roles,
            "tls13": s.tls_13,
            "s3EncryptionAndVersioning": s.s3_encryption_and_versioning,
            "complianceAudits": s.compliance_audits,
        }
        if s
        else {}
    )
    evaluated = evaluate_iam_security_controls(controls_dict, proposal.selected_services)
    return SecurityPostureResponse(proposal_id=proposal.id, **evaluated)


@router.post(
    "/security/evaluate",
    response_model=SecurityPostureResponse,
    summary="Calcula el puntaje IAM (0-100 pts) en memoria sin requerir ID de propuesta",
)
async def evaluate_security_standalone(payload: SecurityControlsPayload) -> SecurityPostureResponse:
    """Permite al frontend previsualizar el puntaje IAM al activar/desactivar switches."""
    evaluated = evaluate_iam_security_controls(payload.model_dump(), payload.selected_services)
    return SecurityPostureResponse(proposal_id=None, **evaluated)

