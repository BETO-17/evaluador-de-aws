# Referencia de Implementación Backend — Gatekeeper Freemium y Webhook de Pago

---

## 1. Esquema SQL de Control de Intentos (`users`)

```sql
-- Extensión de la tabla users para soportar el modelo Freemium (plan_suscripcion.txt)
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS intentos_usados INTEGER NOT NULL DEFAULT 0 CHECK (intentos_usados >= 0),
    ADD COLUMN IF NOT EXISTS plan_actual VARCHAR(20) NOT NULL DEFAULT 'free' CHECK (plan_actual IN ('free', 'premium'));
```

---

## 2. Servicio Gatekeeper en FastAPI (`app/services/subscription_gatekeeper.py`)

```python
"""
===============================================================================
PROYECTO: Cloud Diagnostix — AWS Cloud Suite Backend
MÓDULO: app/services/subscription_gatekeeper.py
CAPA ARQUITECTÓNICA: Services (Gatekeeper de Cuota Freemium — 2 Intentos Gratis)
DESCRIPCIÓN:
    Valida el plan de suscripción ('free' vs 'premium') y el contador de
    intentos usados (máx. 2 en plan 'free') antes de ejecutar el Motor REA o
    consumir llamadas a Gemini AI.
INTEGRACIÓN FRONTEND / BD:
    - Frontend: Interceptor HTTP 402/403 (LIMIT_REACHED) en React + TypeScript
    - Base de Datos: Tabla `users` (columnas `intentos_usados`, `plan_actual`)
    - Referencia Contexto: plan_suscripcion.txt
===============================================================================
"""

from typing import Any, Dict, Optional
from fastapi import Header, HTTPException, status
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from app.core.security import get_password_hash
from app.models.user import User

# [REGLA DE NEGOCIO - FREEMIUM]: Límite estricto de 2 intentos gratuitos por correo
MAX_FREE_ATTEMPTS: int = 2


def get_or_create_trial_user(db: Session, email: str) -> User:
    """
    Busca un usuario por su correo electrónico. Si es la primera vez que ingresa
    su correo en la plataforma, crea un registro rápido con `intentos_usados = 0`
    y `plan_actual = 'free'`.
    """
    clean_email = email.strip().lower()
    user = db.query(User).filter(User.email == clean_email).first()
    if not user:
        user = User(
            email=clean_email,
            full_name=clean_email.split("@")[0].replace(".", " ").title(),
            password_hash=get_password_hash("TrialUserAws2026!"),
            role="Cloud Trial User",
            intentos_usados=0,
            plan_actual="free",
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    return user


def check_and_consume_attempt(db: Session, email: str) -> Dict[str, Any]:
    """
    Ejecuta la lógica del 'Gatekeeper' (plan_suscripcion.txt):
    1. Si `plan_actual == 'premium'`, permite la operación sin restricciones.
    2. Si `plan_actual == 'free'` y `intentos_usados >= 2`, bloquea la petición
       con HTTP 402 Payment Required y `{"error": "LIMIT_REACHED"}` ANTES de
       ejecutar el Motor REA.
    3. Si `intentos_usados < 2`, incrementa `intentos_usados += 1` y permite continuar.
    """
    user = get_or_create_trial_user(db, email)

    # Caso 1: Usuario con suscripción Premium activa -> Acceso ilimitado
    if getattr(user, "plan_actual", "free") == "premium":
        return {
            "email": user.email,
            "plan_actual": "premium",
            "intentos_usados": getattr(user, "intentos_usados", 0),
            "max_intentos": None,
            "intentos_restantes": None,
        }

    # Caso 2: Usuario en plan 'free' que ya agotó sus 2 intentos gratuitos
    current_attempts = getattr(user, "intentos_usados", 0)
    if current_attempts >= MAX_FREE_ATTEMPTS:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail={
                "error": "LIMIT_REACHED",
                "message": (
                    "Has alcanzado el límite de 2 evaluaciones gratuitas con este correo. "
                    "Suscríbete al Plan Premium para desbloquear auditorías REA ilimitadas."
                ),
                "email": user.email,
                "intentos_usados": current_attempts,
                "max_intentos": MAX_FREE_ATTEMPTS,
                "plan_actual": "free",
                "upgrade_url": "/pricing",
            },
        )

    # Caso 3: Intento gratuito disponible (< 2) -> Consumir +1 intento
    user.intentos_usados = current_attempts + 1
    db.commit()
    db.refresh(user)

    return {
        "email": user.email,
        "plan_actual": "free",
        "intentos_usados": user.intentos_usados,
        "max_intentos": MAX_FREE_ATTEMPTS,
        "intentos_restantes": max(MAX_FREE_ATTEMPTS - user.intentos_usados, 0),
    }
```

