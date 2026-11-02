"""Códigos temporales enviados por correo para autenticación y recuperación."""

import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import relationship

from app.core.database import Base


class EmailVerificationCode(Base):
    __tablename__ = "email_verification_codes"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    purpose = Column(String(40), nullable=False, index=True)
    code_hash = Column(String(128), nullable=False, index=True)
    expires_at = Column(DateTime, nullable=False, index=True)
    used_at = Column(DateTime, nullable=True)
    attempts = Column(Integer, nullable=False, default=0)
    requested_ip = Column(String(64), nullable=True)
    created_at = Column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc), index=True)

    user = relationship("User", back_populates="email_verification_codes")
