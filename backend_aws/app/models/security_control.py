"""
===============================================================================
PROYECTO: Cloud Diagnostix — AWS Cloud Suite Backend
MÓDULO: app/models/security_control.py
CAPA ARQUITECTÓNICA: Models (Persistencia SQLAlchemy 2.0)
DESCRIPCIÓN:
    Modelo ORM para la tabla `proposal_security_controls`. Persiste los 6
    controles de seguridad IAM por propuesta de migración, su puntaje (0-100 pts)
    y la clasificación de postura ('Postura Robusta', 'Postura Aceptable',
    'Postura Crítica').
INTEGRACIÓN FRONTEND / BD:
    - Frontend: AwsPlanning.tsx y AwsReaTechSheetModal.tsx
    - Base de Datos: Tabla `proposal_security_controls`
    - Referencia Contexto: context_backend/04_SEGURIDAD_IAM_TOTP_Y_DIAGRAMAS_AWS4.md
===============================================================================
"""

import uuid
from datetime import datetime, timezone
from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import relationship

from app.core.database import Base


# ==========================================================
# 1. MODELO ORM: CONTROLES DE SEGURIDAD IAM (`proposal_security_controls`)
# ==========================================================
class ProposalSecurityControl(Base):
    """
    Matriz de 6 controles de seguridad IAM evaluados para cada propuesta cloud:
    1. root_blocked (+20 pts)
    2. mfa_enforced (+20 pts)
    3. ec2_roles (+20 pts si EC2 está en selected_services)
    4. tls_13 (+15 pts)
    5. s3_encryption_and_versioning (+15 pts si S3 está en selected_services)
    6. compliance_audits (+10 pts)
    """

    __tablename__ = "proposal_security_controls"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    proposal_id = Column(
        String(36),
        ForeignKey("cloud_proposals.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
    )
    root_blocked = Column(Boolean, nullable=False, default=True)
    mfa_enforced = Column(Boolean, nullable=False, default=True)
    ec2_roles = Column(Boolean, nullable=False, default=True)
    tls_13 = Column(Boolean, nullable=False, default=True)
    s3_encryption_and_versioning = Column(Boolean, nullable=False, default=True)
    compliance_audits = Column(Boolean, nullable=False, default=True)
    security_score = Column(Integer, nullable=False, default=100)
    posture_label = Column(String(40), nullable=False, default="Postura Robusta")
    updated_at = Column(
        DateTime,
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    proposal = relationship("CloudProposal", back_populates="security_controls")

