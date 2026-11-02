"""
===============================================================================
PROYECTO: Cloud Diagnostix — AWS Cloud Suite Backend
MÓDULO: app/models/__init__.py
CAPA ARQUITECTÓNICA: Models (Exportador de Entidades ORM)
DESCRIPCIÓN:
    Exporta las 7 clases de modelos SQLAlchemy 2.0 para que `Base.metadata.create_all`
    y Alembic registren todas las tablas automáticamente.
===============================================================================
"""

from app.models.user import User
from app.models.proposal import CloudProposal
from app.models.rea_evaluation import ProposalReaEvaluation
from app.models.security_control import ProposalSecurityControl
from app.models.cost_item import CostSimulationItem
from app.models.diagram import ArchitectureDiagram, RegionMigrationLog
from app.models.password_reset_token import PasswordResetToken
from app.models.email_verification_code import EmailVerificationCode

__all__ = [
    "User",
    "CloudProposal",
    "ProposalReaEvaluation",
    "ProposalSecurityControl",
    "CostSimulationItem",
    "ArchitectureDiagram",
    "RegionMigrationLog",
    "PasswordResetToken",
    "EmailVerificationCode",
]

