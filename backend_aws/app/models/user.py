"""
===============================================================================
PROYECTO: Cloud Diagnostix — AWS Cloud Suite Backend
MÓDULO: app/models/user.py
CAPA ARQUITECTÓNICA: Models (Persistencia SQLAlchemy 2.0)
DESCRIPCIÓN:
    Modelo ORM para la tabla `users`. Gestiona la identidad de los arquitectos
    cloud, su rol, preferencia visual de tema, su secreto MFA TOTP (RFC 6238) y
    el estado de suscripción Freemium (`intentos_usados` y `plan_actual`).
INTEGRACIÓN FRONTEND / BD:
    - Frontend: AwsLogin.tsx, SubscriptionContext.tsx y AwsSubscriptionPaywallModal.tsx
    - Base de Datos: Tabla `users`
    - Referencia Contexto: context_backend/01_MODELO_DATOS_Y_BASE_DE_DATOS.md y plan_suscripcion.txt
===============================================================================
"""

import uuid
from datetime import datetime, timezone
from sqlalchemy import Boolean, Column, DateTime, Integer, String
from sqlalchemy.orm import relationship

from app.core.database import Base


# ==========================================================
# 1. MODELO ORM: TABLA DE USUARIOS (`users`)
# ==========================================================
class User(Base):
    """
    Entidad de usuario de Cloud Diagnostix con soporte de:
    - Segundo factor TOTP (RFC 6238).
    - Control de estado Freemium (`plan_suscripcion.txt`):
      * `intentos_usados`: Entero que inicia en 0 (límite de 2 en plan 'free').
      * `plan_actual`: Cadena con el plan ('free' o 'premium').
    Relación 1:N con `cloud_proposals`.
    """

    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String(160), unique=True, nullable=False, index=True)
    full_name = Column(String(120), nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(60), nullable=False, default="AWS Solutions Architect")
    # [REGLA DE NEGOCIO - MFA TOTP]: Clave Base32 de 16 caracteres (RFC 6238)
    totp_secret = Column(String(64), nullable=False, default="JBSWY3DPEHPK3PXP")
    totp_enabled = Column(Boolean, nullable=False, default=True)
    theme_preference = Column(String(16), nullable=False, default="light")
    password_changed_at = Column(DateTime, nullable=True)
    token_version = Column(Integer, nullable=False, default=0)

    # [REGLA DE NEGOCIO - MODELO FREEMIUM (plan_suscripcion.txt)]:
    # Todo usuario nuevo o correo registrado para prueba inicia en plan 'free'
    # con 0 intentos usados y tiene derecho a 2 intentos gratuitos antes del Paywall.
    intentos_usados = Column(Integer, nullable=False, default=0)
    plan_actual = Column(String(20), nullable=False, default="free")

    created_at = Column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(
        DateTime,
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Relación 1:N con las propuestas de arquitectura creadas por el usuario
    proposals = relationship("CloudProposal", back_populates="user")
    password_reset_tokens = relationship(
        "PasswordResetToken",
        back_populates="user",
        cascade="all, delete-orphan",
    )
    email_verification_codes = relationship(
        "EmailVerificationCode",
        back_populates="user",
        cascade="all, delete-orphan",
    )
