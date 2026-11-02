"""
===============================================================================
PROYECTO: Cloud Diagnostix — AWS Cloud Suite Backend
MÓDULO: app/schemas/auth_schema.py
CAPA ARQUITECTÓNICA: Schemas (Contratos Pydantic v2 para Autenticación y código de correo)
DESCRIPCIÓN:
    Define los contratos de entrada y salida JSON para `/api/v1/auth/login` y
    `/api/v1/auth/verify-email-code`, incluyendo el estado de suscripción Freemium
    (`intentos_usados` y `plan_actual`) del usuario autenticado.
INTEGRACIÓN FRONTEND / BD:
    - Frontend: src/features/modules/aws-cloud/pages/AwsLogin.tsx
    - Referencia Contexto: context_backend/02_CONTRATOS_API_REST_ENDPOINTS.md y plan_suscripcion.txt
===============================================================================
"""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


# ==========================================================
# 1. ESQUEMAS DE LOGIN (PASO 1: CREDENCIALES PRIMARIAS)
# ==========================================================
class LoginRequest(BaseModel):
    """Payload enviado por AwsLogin.tsx para validar correo y contraseña."""

    email: str = Field(..., examples=["arquitecto@clouddiagnostix.aws"])
    password: str = Field(..., examples=["AdminAws2026!"])


class RegisterRequest(BaseModel):
    """Datos necesarios para crear una cuenta real con verificación por correo."""

    email: str = Field(..., examples=["arquitecto@empresa.com"])
    password: str = Field(..., min_length=8, examples=["UnaClaveSegura2026!"])
    full_name: str = Field(..., min_length=2, examples=["Ana Pérez"])
    role: str = Field("AWS Solutions Architect")


class UserSummarySchema(BaseModel):
    """
    Resumen de perfil del arquitecto autenticado, incluyendo su contador de
    intentos gratuitos (`intentos_usados`) y su plan (`'free'` | `'premium'`).
    """

    id: Optional[str] = None
    email: str
    full_name: str
    role: str
    theme_preference: str = "light"
    intentos_usados: int = 0
    plan_actual: str = "free"


class LoginPreAuthResponse(BaseModel):
    """
    Respuesta del Paso 1 de autenticación. Indica que se requiere el segundo
    código de correo de 6 dígitos y entrega el `pre_auth_token` temporal.
    """

    requires_email_code: bool = True
    pre_auth_token: str
    user: UserSummarySchema


class RegisterResponse(LoginPreAuthResponse):
    """Respuesta de registro; el código se envía al correo registrado."""


class PasswordRecoveryRequest(BaseModel):
    email: str = Field(..., examples=["usuario@empresa.com"])


class PasswordRecoveryValidateResponse(BaseModel):
    valid: bool
    email_hint: Optional[str] = None
    expires_at: Optional[datetime] = None
    message: str


class PasswordRecoveryConfirmRequest(BaseModel):
    token: str = Field(..., min_length=20)
    new_password: str = Field(..., min_length=8)
    confirm_password: str = Field(..., min_length=8)
    email_code: str = Field(..., min_length=6, max_length=6)


class PasswordActionResponse(BaseModel):
    message: str


# ==========================================================
# 2. ESQUEMAS DE VERIFICACIÓN POR CORREO (PASO 2)
# ==========================================================
class EmailCodeVerifyRequest(BaseModel):
    """
    Payload para verificar el código temporal de 6 dígitos enviado por correo.
    """

    email_code: str = Field(..., description="Código numérico enviado por correo", examples=["482910"])
    pre_auth_token: str = Field(..., description="Token temporal emitido en /auth/login")


class EmailCodeVerifyResponse(BaseModel):
    """
    Respuesta unificada de `/api/v1/auth/verify-email-code`.
    Incluye tanto `verified` + `timestamp` como `access_token` + `user` para
    satisfacer simultáneamente todos los contratos del frontend.
    """

    verified: bool = True
    timestamp: str
    access_token: str
    token_type: str = "bearer"
    expires_in: int = 28800
    user: UserSummarySchema
