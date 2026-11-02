"""
===============================================================================
PROYECTO: Cloud Diagnostix — AWS Cloud Suite Backend
MÓDULO: app/models/diagram.py
CAPA ARQUITECTÓNICA: Models (Persistencia SQLAlchemy 2.0)
DESCRIPCIÓN:
    Modelos ORM para las tablas `architecture_diagrams` (almacenamiento de XML
    Draw.io con stencils oficiales mxgraph.aws4 y grafos React Flow) y
    `region_migrations_log` (bitácora de migración entre regiones AWS para el
    Globo 3D interactivo).
INTEGRACIÓN FRONTEND / BD:
    - Frontend: AwsDrawioEditor.tsx y Globo 3D de Regiones AWS
    - Base de Datos: Tablas `architecture_diagrams` y `region_migrations_log`
    - Referencia Contexto: context_backend/01_MODELO_DATOS_Y_BASE_DE_DATOS.md
===============================================================================
"""

import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, DateTime, ForeignKey, JSON, String, Text, UniqueConstraint
from sqlalchemy.orm import relationship

from app.core.database import Base


# ==========================================================
# 1. MODELO ORM: DIAGRAMAS DE ARQUITECTURA (`architecture_diagrams`)
# ==========================================================
class ArchitectureDiagram(Base):
    """
    Persiste el diagrama de arquitectura de una propuesta en formato XML de
    Draw.io (`diagram_type = 'drawio_aws4'`) o JSON de React Flow (`'reactflow'`).
    """

    __tablename__ = "architecture_diagrams"
    __table_args__ = (
        UniqueConstraint("proposal_id", "diagram_type", name="uq_proposal_diagram_type"),
    )

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    proposal_id = Column(
        String(36),
        ForeignKey("cloud_proposals.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    diagram_type = Column(String(30), nullable=False, default="drawio_aws4")
    drawio_xml = Column(Text, nullable=True)
    reactflow_graph = Column(JSON, nullable=True)
    region_snapshot = Column(String(40), nullable=False, default="sa-east-1")
    updated_at = Column(
        DateTime,
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    proposal = relationship("CloudProposal", back_populates="diagrams")


# ==========================================================
# 2. MODELO ORM: BITÁCORA DE MIGRACIONES DE REGIÓN (`region_migrations_log`)
# ==========================================================
class RegionMigrationLog(Base):
    """
    Registra cada evento de migración de región AWS (ej. `sa-east-1` -> `us-east-1`)
    ejecutado sobre una propuesta para alimentar la trazabilidad y el Globo 3D.
    """

    __tablename__ = "region_migrations_log"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    proposal_id = Column(
        String(36),
        ForeignKey("cloud_proposals.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    from_region = Column(String(40), nullable=False)
    to_region = Column(String(40), nullable=False)
    migrated_services = Column(JSON, nullable=False, default=list)
    migrated_at = Column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))

    proposal = relationship("CloudProposal", back_populates="region_migrations")

