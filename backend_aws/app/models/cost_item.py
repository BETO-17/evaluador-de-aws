"""
===============================================================================
PROYECTO: Cloud Diagnostix — AWS Cloud Suite Backend
MÓDULO: app/models/cost_item.py
CAPA ARQUITECTÓNICA: Models (Persistencia SQLAlchemy 2.0)
DESCRIPCIÓN:
    Modelo ORM para la tabla `cost_simulation_items`. Almacena el desglose
    unitario, horario (730 horas/mes), mensual y anual de cada servicio AWS
    incluido en una propuesta.
INTEGRACIÓN FRONTEND / BD:
    - Frontend: Simulador de Costos FinOps en AwsPlanning.tsx
    - Base de Datos: Tabla `cost_simulation_items`
    - Referencia Contexto: context_backend/01_MODELO_DATOS_Y_BASE_DE_DATOS.md
===============================================================================
"""

import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer, String
from sqlalchemy.orm import relationship

from app.core.database import Base


# ==========================================================
# 1. MODELO ORM: ÍTEMS DE SIMULACIÓN FINOPS (`cost_simulation_items`)
# ==========================================================
class CostSimulationItem(Base):
    """
    Representa una línea de costo de un servicio AWS dentro de la calculadora FinOps.
    """

    __tablename__ = "cost_simulation_items"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    proposal_id = Column(
        String(36),
        ForeignKey("cloud_proposals.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    service_id = Column(String(60), nullable=False)
    service_name = Column(String(160), nullable=False)
    service_code = Column(String(50), nullable=False)
    category = Column(String(80), nullable=False)
    instance_type_or_tier = Column(String(160), nullable=False)
    quantity = Column(Integer, nullable=False, default=1)
    # [REGLA DE NEGOCIO - FINOPS]: Estándar AWS de 730 horas operativas por mes (365 * 24 / 12)
    hours_per_month = Column(Integer, nullable=False, default=730)
    unit = Column(String(40), nullable=True, default="hour")
    unit_price = Column(Float, nullable=False, default=0.0)
    cost_per_hour = Column(Float, nullable=False, default=0.0)
    monthly_cost = Column(Float, nullable=False, default=0.0)
    annual_cost = Column(Float, nullable=False, default=0.0)
    created_at = Column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))

    proposal = relationship("CloudProposal", back_populates="cost_items")

