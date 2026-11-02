"""
===============================================================================
PROYECTO: Cloud Diagnostix — AWS Cloud Suite Backend
MÓDULO: app/services/subscription_gatekeeper.py
CAPA ARQUITECTÓNICA: Services (Gatekeeper de Cuota Freemium y Conversión SaaS)
DESCRIPCIÓN:
    Implementa la lógica completa del modelo de prueba interactiva Freemium
    especificado en `plan_suscripcion.txt`:
    1. Registro rápido en base de datos al ingresar un correo (`email`),
       iniciando con `intentos_usados = 0` y `plan_actual = 'free'`.
    2. El "Gatekeeper": valida el plan (`'free'` vs `'premium'`) y bloquea el
       3er intento (`intentos_usados >= 2`) con HTTP 402 Payment Required y
       `{"error": "LIMIT_REACHED"}` ANTES de consumir recursos del Motor REA o
       de Google Gemini AI.
    3. Conversión instantánea a `'premium'` tras recibir confirmación del
       Webhook de la pasarela de pago (Stripe / MercadoPago).
INTEGRACIÓN FRONTEND / BD:
    - Frontend: `plan_suscricion/src/` (`subscriptionInterceptor.ts`, `SubscriptionContext.tsx`)
    - Base de Datos: Tabla `users` (`intentos_usados`, `plan_actual`)
    - Referencia Contexto: plan_suscripcion.txt
===============================================================================
"""

from datetime import datetime, timezone
from typing import Any, Dict, Optional
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.security import decode_jwt_token, get_password_hash
from app.models.user import User

# ==========================================================
# 1. CONSTANTES DE REGLA DE NEGOCIO FREEMIUM
# ==========================================================
# [REGLA DE NEGOCIO - FREEMIUM (plan_suscripcion.txt)]:
# Cada correo electrónico dispone exactamente de 2 intentos gratuitos en plan 'free'.
MAX_FREE_ATTEMPTS: int = 2


class LimitReachedHTTPException(HTTPException):
    """
    Excepción HTTP especializada (402 Payment Required) lanzada por el Gatekeeper
    cuando un usuario en plan `'free'` alcanza o supera los 2 intentos gratuitos.
    """

    def __init__(self, payload: Dict[str, Any]):
        super().__init__(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail=payload,
        )
        self.payload = payload


# ==========================================================
# 2. IDENTIFICACIÓN DE USUARIO Y REGISTRO RÁPIDO POR CORREO
# ==========================================================
def resolve_user_email(
    explicit_email: Optional[str] = None,
    x_user_email: Optional[str] = None,
    authorization: Optional[str] = None,
) -> Optional[str]:
    """
    Extrae el correo identificador del usuario siguiendo orden de prioridad:
    1. Parámetro explícito `email` (enviado en formulario, query o JSON body).
    2. Encabezado HTTP `X-User-Email` inyectado por `subscriptionInterceptor.ts`.
    3. Claim `email` dentro del token JWT en el encabezado `Authorization: Bearer <token>`.
    """
    if explicit_email and explicit_email.strip():
        return explicit_email.strip().lower()

    if x_user_email and x_user_email.strip():
        return x_user_email.strip().lower()

    if authorization and authorization.lower().startswith("bearer "):
        raw_token = authorization.split(" ", 1)[1].strip()
        claims = decode_jwt_token(raw_token)
        if claims and claims.get("email"):
            return str(claims["email"]).strip().lower()

    return None


def get_or_create_trial_user(
    db: Session,
    email: str,
    full_name: Optional[str] = None,
) -> User:
    """
    Busca al usuario por su `email` único en la tabla `users`.
    Si no existe, crea un registro rápido con `intentos_usados = 0` y
    `plan_actual = 'free'` tal como define la Sección 1 de `plan_suscripcion.txt`.
    """
    clean_email = email.strip().lower()
    user = db.query(User).filter(User.email == clean_email).first()

    if not user:
        derived_name = full_name or clean_email.split("@")[0].replace(".", " ").title()
        user = User(
            email=clean_email,
            full_name=derived_name,
            password_hash=get_password_hash("TrialUserAws2026!"),
            role="Cloud Trial Architect",
            intentos_usados=0,
            plan_actual="free",
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    return user


def format_user_quota_status(user: User) -> Dict[str, Any]:
    """
    Construye el diccionario estandarizado con el estado de suscripción e
    intentos del usuario para el frontend en React + TypeScript.
    """
    plan = (user.plan_actual or "free").lower()
    used = int(user.intentos_usados or 0)

    if plan == "premium":
        return {
            "user_id": user.id,
            "email": user.email,
            "intentos_usados": used,
            "max_intentos": None,
            "intentos_restantes": None,
            "plan_actual": "premium",
            "can_execute": True,
        }

    remaining = max(MAX_FREE_ATTEMPTS - used, 0)
    return {
        "user_id": user.id,
        "email": user.email,
        "intentos_usados": used,
        "max_intentos": MAX_FREE_ATTEMPTS,
        "intentos_restantes": remaining,
        "plan_actual": "free",
        "can_execute": used < MAX_FREE_ATTEMPTS,
    }


# ==========================================================
# 3. EL "GATEKEEPER" DE INTENTOS GRATUITOS (SECCIÓN 2)
# ==========================================================
def validate_gatekeeper_precheck(db: Session, email: str) -> User:
    """
    Paso previo del Gatekeeper que se ejecuta ANTES de descomprimir el archivo
    `.zip` o invocar a Gemini AI:
    - Si `plan_actual == 'premium'`, permite continuar sin restricciones.
    - Si `plan_actual == 'free'` y `intentos_usados >= 2`, bloquea inmediatamente
      lanzando `LimitReachedHTTPException` (HTTP 402 `{"error": "LIMIT_REACHED"}`).
    """
    user = get_or_create_trial_user(db, email)
    plan = (user.plan_actual or "free").lower()
    used = int(user.intentos_usados or 0)

    # [REGLA DE NEGOCIO - GATEKEEPER (plan_suscripcion.txt)]:
    # Si el plan es 'free' y el usuario ya usó sus 2 intentos gratuitos,
    # abortar ANTES de consumir recursos de cómputo o tokens de IA.
    if plan == "free" and used >= MAX_FREE_ATTEMPTS:
        raise LimitReachedHTTPException(
            {
                "error": "LIMIT_REACHED",
                "message": (
                    "Has alcanzado el límite de 2 intentos gratuitos asociados a tu correo. "
                    "Actualiza al Plan Premium para desbloquear auditorías REA ilimitadas."
                ),
                "email": user.email,
                "intentos_usados": used,
                "max_intentos": MAX_FREE_ATTEMPTS,
                "plan_actual": "free",
                "upgrade_url": "/pricing",
            }
        )

    return user


def consume_gatekeeper_attempt(db: Session, user: User) -> Dict[str, Any]:
    """
    Incrementa `intentos_usados += 1` una vez que la validación precheck fue
    aprobada y persiste el cambio en la base de datos.
    """
    user.intentos_usados = int(user.intentos_usados or 0) + 1
    user.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(user)
    return format_user_quota_status(user)


def enforce_freemium_gatekeeper(db: Session, email: str) -> Dict[str, Any]:
    """
    Ejecuta en un solo paso atómico la validación del Gatekeeper y el consumo
    de `+1` intento si el usuario tiene cuota disponible.
    """
    user = validate_gatekeeper_precheck(db, email)
    return consume_gatekeeper_attempt(db, user)


# ==========================================================
# 4. CONVERSIÓN A PREMIUM VÍA WEBHOOK DE PASARELA (SECCIÓN 4)
# ==========================================================
def upgrade_user_to_premium(db: Session, email: str) -> Dict[str, Any]:
    """
    Actualiza `plan_actual = 'premium'` en la tabla `users` cuando el Webhook
    de Stripe o MercadoPago confirma un pago exitoso, desbloqueando la
    plataforma instantáneamente de forma idempotente.
    """
    user = get_or_create_trial_user(db, email)
    user.plan_actual = "premium"
    user.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(user)
    return format_user_quota_status(user)

