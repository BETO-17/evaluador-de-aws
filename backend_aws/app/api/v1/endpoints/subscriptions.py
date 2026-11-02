"""
===============================================================================
PROYECTO: Cloud Diagnostix — AWS Cloud Suite Backend
MÓDULO: app/api/v1/endpoints/subscriptions.py
CAPA ARQUITECTÓNICA: API v1 (Suscripción Freemium, Gatekeeper y Webhook de Pago)
DESCRIPCIÓN:
    Expone los endpoints para el flujo completo de `plan_suscripcion.txt`:
    1. `POST /api/v1/subscriptions/register-trial`: Registro rápido por correo
       (`intentos_usados = 0`, `plan_actual = 'free'`).
    2. `GET /api/v1/subscriptions/status`: Consulta de intentos usados y plan.
    3. `POST /api/v1/subscriptions/consume-attempt`: Validador Gatekeeper directo.
    4. `POST /api/v1/subscriptions/checkout`: Creación de sesión de pago (Stripe / MercadoPago).
    5. `POST /api/v1/subscriptions/webhook`: Webhook que ejecuta el `UPDATE` a `'premium'`.
    6. `POST /api/v1/subscriptions/reset-trial`: Reinicio de cuota para pruebas/demos.
INTEGRACIÓN FRONTEND / BD:
    - Frontend: `plan_suscricion/src/` (`SubscriptionContext.tsx`, `AwsSubscriptionPaywallModal.tsx`)
    - Base de Datos: Tabla `users` (`intentos_usados`, `plan_actual`)
    - Referencia Contexto: plan_suscripcion.txt
===============================================================================
"""

from typing import Optional
import uuid
from fastapi import APIRouter, Depends, Header, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.subscription_schema import (
    CheckoutSessionRequest,
    CheckoutSessionResponse,
    PaymentWebhookPayload,
    SubscriptionQuotaStatusResponse,
    TrialEmailRegisterRequest,
    WebhookProcessResponse,
)
from app.services.subscription_gatekeeper import (
    enforce_freemium_gatekeeper,
    format_user_quota_status,
    get_or_create_trial_user,
    resolve_user_email,
    upgrade_user_to_premium,
)

router = APIRouter(prefix="/subscriptions", tags=["Suscripción Freemium (2 Intentos) & Pagos"])


# ==========================================================
# 1. REGISTRO RÁPIDO POR CORREO Y CONSULTA DE CUOTA
# ==========================================================
@router.post(
    "/register-trial",
    response_model=SubscriptionQuotaStatusResponse,
    summary="Registra un correo electrónico para la prueba interactiva (2 intentos gratuitos)",
)
async def register_trial_email_endpoint(
    payload: TrialEmailRegisterRequest,
    db: Session = Depends(get_db),
) -> SubscriptionQuotaStatusResponse:
    """
    Cuando el usuario ingresa su correo en la plataforma, crea un registro rápido
    en la tabla `users` con `intentos_usados = 0` y `plan_actual = 'free'` (o
    devuelve su estado actual si ya estaba registrado).
    """
    user = get_or_create_trial_user(db, payload.email, payload.full_name)
    quota = format_user_quota_status(user)
    return SubscriptionQuotaStatusResponse(**quota)


@router.get(
    "/status",
    response_model=SubscriptionQuotaStatusResponse,
    summary="Consulta los intentos usados (0/2) y el plan actual ('free' o 'premium') de un correo",
)
async def get_subscription_status_endpoint(
    email: Optional[str] = Query(None, description="Correo electrónico del usuario"),
    x_user_email: Optional[str] = Header(None, alias="X-User-Email"),
    authorization: Optional[str] = Header(None, alias="Authorization"),
    db: Session = Depends(get_db),
) -> SubscriptionQuotaStatusResponse:
    """
    Permite al frontend en React + TypeScript sincronizar el contador de intentos
    y verificar si el usuario ya pasó a `'premium'`.
    """
    resolved_email = resolve_user_email(email, x_user_email, authorization)
    if not resolved_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Debe proporcionar el parámetro 'email' o el encabezado 'X-User-Email'.",
        )

    user = get_or_create_trial_user(db, resolved_email)
    quota = format_user_quota_status(user)
    return SubscriptionQuotaStatusResponse(**quota)


# ==========================================================
# 2. VALIDADOR GATEKEEPER DE INTENTOS GRATUITOS
# ==========================================================
@router.post(
    "/consume-attempt",
    response_model=SubscriptionQuotaStatusResponse,
    summary="Valida el Gatekeeper Freemium y consume +1 intento (bloquea el 3ro con HTTP 402 LIMIT_REACHED)",
)
async def consume_attempt_endpoint(
    payload: TrialEmailRegisterRequest,
    db: Session = Depends(get_db),
) -> SubscriptionQuotaStatusResponse:
    """
    Ejecuta la regla del Gatekeeper (`plan_suscripcion.txt`):
    - Si `plan_actual == 'premium'`: permite sin límite.
    - Si `plan_actual == 'free'` e `intentos_usados < 2`: suma `+1` y devuelve `200 OK`.
    - Si `plan_actual == 'free'` e `intentos_usados >= 2`: devuelve `HTTP 402 Payment Required`
      con `{"error": "LIMIT_REACHED"}`.
    """
    quota = enforce_freemium_gatekeeper(db, payload.email)
    return SubscriptionQuotaStatusResponse(**quota)


# ==========================================================
# 3. CONVERSIÓN Y PASARELA DE PAGO (STRIPE / MERCADOPAGO)
# ==========================================================
@router.post(
    "/checkout",
    response_model=CheckoutSessionResponse,
    summary="Genera la sesión de pago en Stripe o MercadoPago para actualizar al Plan Premium",
)
async def create_checkout_session_endpoint(
    payload: CheckoutSessionRequest,
    db: Session = Depends(get_db),
) -> CheckoutSessionResponse:
    """
    Prepara la orden de suscripción para el correo indicado y devuelve la URL
    de checkout de la pasarela seleccionada (`stripe` o `mercadopago`).
    """
    user = get_or_create_trial_user(db, payload.email)
    session_id = f"chk_{payload.provider}_{uuid.uuid4().hex[:16]}"
    checkout_url = (
        f"{payload.success_url or 'http://localhost:5173/pricing'}"
        f"&session_id={session_id}&email={user.email}&provider={payload.provider}"
    )

    return CheckoutSessionResponse(
        checkout_url=checkout_url,
        session_id=session_id,
        provider=payload.provider,
        email=user.email,
        plan_target="premium",
        amount_usd=29.00,
        currency="USD",
    )


@router.post(
    "/webhook",
    response_model=WebhookProcessResponse,
    summary="Webhook de Stripe / MercadoPago que cambia plan_actual a 'premium' instantáneamente",
)
async def payment_webhook_endpoint(
    payload: PaymentWebhookPayload,
    db: Session = Depends(get_db),
) -> WebhookProcessResponse:
    """
    Recibe el evento de pago exitoso desde Stripe (`checkout.session.completed`)
    o MercadoPago (`payment.updated` / `payment.approved`) y ejecuta el `UPDATE`
    en la tabla `users` cambiando `plan_actual = 'premium'`.
    """
    target_email = payload.email
    if not target_email and payload.data:
        obj = payload.data.get("object", payload.data)
        if isinstance(obj, dict):
            target_email = (
                obj.get("customer_email")
                or obj.get("email")
                or (obj.get("payer", {}) if isinstance(obj.get("payer"), dict) else {}).get("email")
            )

    if not target_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El payload del Webhook no contiene el correo ('email' o 'customer_email') del suscriptor.",
        )

    quota = upgrade_user_to_premium(db, target_email)
    return WebhookProcessResponse(
        received=True,
        upgraded=True,
        email=quota["email"],
        plan_actual="premium",
        intentos_usados=quota["intentos_usados"],
        message=(
            f"Suscripción actualizada exitosamente a 'premium' vía {payload.provider} "
            f"(evento: {payload.event_type})."
        ),
    )


# ==========================================================
# 4. ENDPOINT AUXILIAR DE REINICIO DE PRUEBA (PARA TESTING / DEMO)
# ==========================================================
@router.post(
    "/reset-trial",
    response_model=SubscriptionQuotaStatusResponse,
    summary="Reinicia intentos_usados = 0 y plan_actual = 'free' para pruebas del flujo Freemium",
)
async def reset_trial_quota_endpoint(
    payload: TrialEmailRegisterRequest,
    db: Session = Depends(get_db),
) -> SubscriptionQuotaStatusResponse:
    """Permite reiniciar un correo a 0 intentos en plan 'free' durante demostraciones."""
    user = get_or_create_trial_user(db, payload.email)
    user.intentos_usados = 0
    user.plan_actual = "free"
    db.commit()
    db.refresh(user)
    return SubscriptionQuotaStatusResponse(**format_user_quota_status(user))

