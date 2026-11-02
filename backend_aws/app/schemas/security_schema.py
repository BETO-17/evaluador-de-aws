"""
===============================================================================
PROYECTO: Cloud Diagnostix — AWS Cloud Suite Backend
MÓDULO: app/schemas/security_schema.py
CAPA ARQUITECTÓNICA: Schemas (Contratos Pydantic v2 para Seguridad IAM)
DESCRIPCIÓN:
    Define el payload y la respuesta para los 6 controles de seguridad IAM por
    propuesta de migración (`0 a 100 puntos`), soportando nomenclatura camelCase
    del frontend React (`rootBlocked`, `s3EncryptionAndVersioning`) y snake_case.
INTEGRACIÓN FRONTEND / BD:
    - Frontend: AwsPlanning.tsx y AwsReaTechSheetModal.tsx
    - Base de Datos: Tabla `proposal_security_controls`
    - Referencia Contexto: context_backend/04_SEGURIDAD_IAM_TOTP_Y_DIAGRAMAS_AWS4.md
===============================================================================
"""

from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field


# ==========================================================
# 1. ESQUEMAS DE CONTROLES Y POSTURA DE SEGURIDAD IAM
# ==========================================================
class SecurityControlsPayload(BaseModel):
    """
    Matriz de los 6 controles de seguridad IAM enviada desde el frontend.
    Acepta tanto camelCase (`rootBlocked`) como snake_case (`root_blocked`).
    """

    rootBlocked: bool = Field(True, alias="rootBlocked")
    mfaEnforced: bool = Field(True, alias="mfaEnforced")
    ec2Roles: bool = Field(True, alias="ec2Roles")
    tls13: bool = Field(True, alias="tls13")
    s3EncryptionAndVersioning: bool = Field(True, alias="s3EncryptionAndVersioning")
    complianceAudits: bool = Field(True, alias="complianceAudits")
    selected_services: Optional[List[str]] = None

    model_config = ConfigDict(populate_by_name=True, extra="ignore")


class SecurityPostureResponse(BaseModel):
    """
    Resultado calculado por `iam_security_scorer.py` con el puntaje (0-100 pts),
    etiqueta de postura y roles IAM de mínimo privilegio recomendados.
    """

    proposal_id: Optional[str] = None
    rootBlocked: bool
    mfaEnforced: bool
    ec2Roles: bool
    tls13: bool
    s3EncryptionAndVersioning: bool
    complianceAudits: bool
    security_score: int
    posture_label: str
    recommended_iam_roles: List[str]

