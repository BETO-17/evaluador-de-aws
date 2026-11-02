"""
===============================================================================
PROYECTO: Cloud Diagnostix — AWS Cloud Suite Backend
MÓDULO: app/models/proposal.py
CAPA ARQUITECTÓNICA: Models (Persistencia SQLAlchemy 2.0)
DESCRIPCIÓN:
    Modelo ORM para la tabla central `cloud_proposals`. Almacena los metadatos
    de cada propuesta de migración AWS, región objetivo, nivel de disponibilidad
    (SLA Multi-AZ / Multi-Región), servicios seleccionados y presupuesto FinOps.
INTEGRACIÓN FRONTEND / BD:
    - Frontend: src/features/modules/aws-cloud/pages/AwsPlanning.tsx
    - Base de Datos: Tabla `cloud_proposals`
    - Referencia Contexto: context_backend/01_MODELO_DATOS_Y_BASE_DE_DATOS.md
===============================================================================
"""

import uuid
from datetime import datetime, timezone
from sqlalchemy import Boolean, Column, DateTime, Float, ForeignKey, Integer, JSON, String, Text
from sqlalchemy.orm import relationship

from app.core.database import Base


# ==========================================================
# 1. MODELO ORM: TABLA DE PROPUESTAS CLOUD (`cloud_proposals`)
# ==========================================================
class CloudProposal(Base):
    """
    Entidad maestra que representa una propuesta de arquitectura en Amazon Web Services.
    Agrupa en cascada:
    - 1 Evaluación Técnica REA (`proposal_rea_evaluations`)
    - 1 Matriz de Controles de Seguridad IAM (`proposal_security_controls`)
    - N Ítems de Simulación FinOps (`cost_simulation_items`)
    - N Diagramas de Arquitectura (`architecture_diagrams`)
    - N Registros de Migración Regional (`region_migrations_log`)
    """

    __tablename__ = "cloud_proposals"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    solution_name = Column(String(200), nullable=False)
    app_type = Column(String(80), nullable=False, default="API REST / Backend")
    description = Column(Text, nullable=False)
    region = Column(String(40), nullable=False, default="sa-east-1", index=True)
    estimated_users = Column(Integer, nullable=False, default=5000)
    availability_level = Column(String(80), nullable=False, default="99.95% (Alta Disponibilidad)")
    # Lista JSONB de códigos oficiales del catálogo de 19 servicios AWS
    selected_services = Column(
        JSON,
        nullable=False,
        default=lambda: ["Route 53", "CloudFront", "ALB", "VPC", "EC2", "RDS", "S3", "IAM", "CloudWatch"],
    )
    migration_goal = Column(String(100), nullable=False, default="Modernización de Aplicación")
    monthly_budget = Column(Float, nullable=False, default=0.0)
    annual_budget = Column(Float, nullable=False, default=0.0)
    status = Column(String(40), nullable=False, default="Aprobada")
    applied_scenario = Column(String(80), nullable=True, default="Recommended-Production")
    is_active = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(
        DateTime,
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Relaciones bidireccionales con eliminación en cascada (ON DELETE CASCADE)
    user = relationship("User", back_populates="proposals")
    rea_evaluation = relationship(
        "ProposalReaEvaluation",
        back_populates="proposal",
        uselist=False,
        cascade="all, delete-orphan",
    )
    security_controls = relationship(
        "ProposalSecurityControl",
        back_populates="proposal",
        uselist=False,
        cascade="all, delete-orphan",
    )
    cost_items = relationship(
        "CostSimulationItem",
        back_populates="proposal",
        cascade="all, delete-orphan",
    )
    diagrams = relationship(
        "ArchitectureDiagram",
        back_populates="proposal",
        cascade="all, delete-orphan",
    )
    region_migrations = relationship(
        "RegionMigrationLog",
        back_populates="proposal",
        cascade="all, delete-orphan",
    )

