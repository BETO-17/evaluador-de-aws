"""
===============================================================================
PROYECTO: Cloud Diagnostix — AWS Cloud Suite Backend
MÓDULO: app/models/rea_evaluation.py
CAPA ARQUITECTÓNICA: Models (Persistencia SQLAlchemy 2.0)
DESCRIPCIÓN:
    Modelo ORM para la tabla `proposal_rea_evaluations`. Persiste el resultado
    de la auditoría del Motor REA (evidencia técnica, notas Well-Architected y
    los 3 escenarios de costos: Cost-Optimized, Recommended-Production y
    High-Availability-Enterprise).
INTEGRACIÓN FRONTEND / BD:
    - Frontend: AwsReaTechSheetModal.tsx y analyzerService.ts
    - Base de Datos: Tabla `proposal_rea_evaluations`
    - Referencia Contexto: context_backend/01_MODELO_DATOS_Y_BASE_DE_DATOS.md
===============================================================================
"""

import uuid
from datetime import datetime, timezone
from sqlalchemy import Boolean, Column, DateTime, ForeignKey, JSON, String, Text
from sqlalchemy.orm import relationship

from app.core.database import Base


# ==========================================================
# 1. MODELO ORM: FICHA TÉCNICA DEL MOTOR REA (`proposal_rea_evaluations`)
# ==========================================================
class ProposalReaEvaluation(Base):
    """
    Almacena la Ficha Técnica generada por el Motor REA asociada 1:1 con una
    propuesta de arquitectura (`cloud_proposals`).
    """

    __tablename__ = "proposal_rea_evaluations"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    proposal_id = Column(
        String(36),
        ForeignKey("cloud_proposals.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
    )
    status = Column(String(20), nullable=False, default="success")
    origin_detected = Column(String(160), nullable=False)
    detected_configs = Column(JSON, nullable=False, default=list)
    system_analysis = Column(Text, nullable=False)
    architecture_pattern = Column(String(180), nullable=False)
    migration_strategy = Column(String(120), nullable=False, default="Replatform (Lift, Tinker & Shift)")
    well_architected_notes = Column(JSON, nullable=False, default=list)
    technical_evidence = Column(JSON, nullable=False, default=dict)
    ai_generated = Column(Boolean, nullable=False, default=False)
    ai_provider = Column(String(80), nullable=True)
    # Columna JSONB que guarda los 3 escenarios completos con servicios y pricing
    scenarios = Column(JSON, nullable=False, default=list)
    evaluated_at = Column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))

    proposal = relationship("CloudProposal", back_populates="rea_evaluation")

