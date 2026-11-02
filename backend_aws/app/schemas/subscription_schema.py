"""
===============================================================================
PROYECTO: Cloud Diagnostix — AWS Cloud Suite Backend
MÓDULO: app/schemas/subscription_schema.py
CAPA ARQUITECTÓNICA: Schemas (Contratos Pydantic v2 para Suscripción Freemium)
DESCRIPCIÓN:
    Define los contratos de entrada y salida JSON para el flujo de Prueba
    Interactiva Freemium (2 intentos gratuitos por correo electrónico), el
    error de bloqueo `LIMIT_REACHED` (HTTP 402/403), la creación de sesión de
    pago (Stripe / MercadoPago) y el Webhook de conversión a `'premium'`.
INTEGRACIÓN FRONTEND / BD:
    - Frontend: `plan_suscricion/src/` (`SubscriptionContext.tsx`, `subscriptionInterceptor.ts`)
    - Base de Datos: Tabla `users` (`intentos_usados`, `plan_actual`)
    - Referencia Contexto: plan_suscripcion.txt
===============================================================================
"""

from typing import Any, Dict, Literal, Optional
from pydantic import BaseModel, Field


# ==========================================================
# 1. ESQUEMAS DE REGISTRO RÁPIDO POR CORREO Y ESTADO DE CUOTA
# ==========================================================
class TrialEmailRegisterRequest(BaseModel):
    """
    Payload enviado cuando el usuario ingresa su correo electrónico en el
    frontend para iniciar sus 2 intentos gratuitos.
    """

    email: str = Field(..., description="Correo único del usuario", examples=["cliente@empresa.com"])
    full_name: Optional[str] = Field(None, description="Nombre opcional del usuario")


class SubscriptionQuotaStatusResponse(BaseModel):
    """
    Estado actual del usuario dentro del modelo Freemium (`plan_suscripcion.txt`).
    """

    user_id: str
    email: str
    intentos_usados: int = Field(0, ge=0, description="Intentos consumidos (inicia en 0)")
    max_intentos: Optional[int] = Field(2, description="Límite en plan free (2); None en premium")
    intentos_restantes: Optional[int] = Field(2, description="Intentos gratuitos disponibles")
    plan_actual: Literal["free", "premium"] = "free"
    can_execute: bool = True


# ==========================================================
# 2. ESQUEMA DE BLOQUEO GATEKEEPER (`HTTP 402 / 403 LIMIT_REACHED`)
# ==========================================================
class LimitReachedErrorPayload(BaseModel):
    """
    Contrato exacto devuelto por el Gatekeeper cuando `plan_actual == 'free'`
    y `intentos_usados >= 2`. El interceptor del frontend en React + TypeScript
    atrapa este código para abrir el Modal de Suscripción (`/pricing`).
    """

    error: str = "LIMIT_REACHED"
    message: str = (
        "Has agotado tus 2 intentos gratuitos en Cloud Diagnostix. "
        "Suscríbete al Plan Premium para desbloquear auditorías REA ilimitadas."
    )
    email: str
    intentos_usados: int = 2
    max_intentos: int = 2
    plan_actual: str = "free"
    upgrade_url: str = "/pricing"


# ==========================================================
# 3. ESQUEMAS DE CONVERSIÓN Y PASARELA DE PAGO (STRIPE / MERCADOPAGO)
# ==========================================================
class CheckoutSessionRequest(BaseModel):
    """Solicitud para iniciar el pago de actualización al Plan Premium."""

    email: str = Field(..., examples=["cliente@empresa.com"])
    provider: Literal["stripe", "mercadopago"] = "stripe"
    success_url: Optional[str] = Field("http://localhost:5173/aws-cloud/planning?upgraded=true")
    cancel_url: Optional[str] = Field("http://localhost:5173/pricing?canceled=true")


class CheckoutSessionResponse(BaseModel):
    """Respuesta con la URL de pago y el ID de sesión de la pasarela."""

    checkout_url: str
    session_id: str
    provider: str
    email: str
    plan_target: str = "premium"
    amount_usd: float = 29.00
    currency: str = "USD"


class PaymentWebhookPayload(BaseModel):
    """
    Evento enviado por la pasarela de pago (Stripe `checkout.session.completed`
    o MercadoPago `payment.updated` / `payment.approved`) al webhook del backend.
    Soporta tanto el formato directo como el sobre anidado `data.object`.
    """

    event_type: str = Field(
        "checkout.session.completed",
        description="Tipo de evento de pasarela (ej. checkout.session.completed, payment.approved)",
    )
    email: Optional[str] = Field(None, description="Correo del usuario que completó el pago")
    provider: str = Field("stripe", description="stripe | mercadopago")
    data: Optional[Dict[str, Any]] = Field(
        None,
        description="Objeto anidado opcional de Stripe/MercadoPago (ej. data.object.customer_email)",
    )


class WebhookProcessResponse(BaseModel):
    """Confirmación de procesamiento del Webhook y actualización a 'premium'."""

    received: bool = True
    upgraded: bool = True
    email: str
    plan_actual: str = "premium"
    intentos_usados: int
    message: str

