"""
Pruebas de integración del flujo Freemium de Cloud Diagnostix.

Valida los contratos definidos en plan_suscripcion.md usando el ASGI app real,
incluyendo el bloqueo previo del Gatekeeper y la activación Premium por webhook.
"""

from uuid import uuid4
from urllib.parse import parse_qs, urlparse
from unittest.mock import patch

import httpx
import pytest

from app.core.database import SessionLocal
from app.main import app
from app.models.user import User
from app.models.password_reset_token import PasswordResetToken


@pytest.mark.asyncio
async def test_real_register_login_email_code_and_document_evaluation() -> None:
    """Valida que el frontend pueda registrar una cuenta y evaluar documentos vía API."""
    email = f"pytest-auth-{uuid4().hex}@clouddiagnostix.test"

    async with app.router.lifespan_context(app):
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
            try:
                with patch("app.api.v1.endpoints.auth.send_email_verification_code") as send_code:
                    register = await client.post(
                        "/api/v1/auth/register",
                        json={"email": email, "password": "TestPassword2026!", "full_name": "Auth Integration"},
                    )
                    registration_code = send_code.call_args.args[1]
                assert register.status_code == 201

                with patch("app.api.v1.endpoints.auth.send_email_verification_code") as send_code:
                    login = await client.post(
                        "/api/v1/auth/login",
                        json={"email": email, "password": "TestPassword2026!"},
                    )
                    login_code = send_code.call_args.args[1]
                assert login.status_code == 200

                verify = await client.post(
                    "/api/v1/auth/verify-email-code",
                    json={
                        "pre_auth_token": login.json()["pre_auth_token"],
                        "email_code": login_code,
                    },
                )
                assert verify.status_code == 200
                assert verify.json()["user"]["email"] == email

                document = await client.post(
                    "/api/v1/migration-evaluator/evaluate-document",
                    headers={"X-User-Email": email},
                    json={
                        "name": "architecture.md",
                        "content": "React frontend, FastAPI backend, PostgreSQL and Docker",
                    },
                )
                assert document.status_code == 200
                assert document.json()["technical_evidence"]["total_files"] == 1
                assert document.json()["subscription_quota"]["intentos_usados"] == 1
            finally:
                db = SessionLocal()
                try:
                    db.query(User).filter(User.email == email).delete()
                    db.commit()
                finally:
                    db.close()


@pytest.mark.asyncio
async def test_subscription_lifecycle_and_zip_gatekeeper() -> None:
    """Comprueba 2 intentos, bloqueo 402 y desbloqueo Premium de extremo a extremo."""
    email = f"pytest-{uuid4().hex}@clouddiagnostix.test"

    async with app.router.lifespan_context(app):
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
            try:
                register = await client.post(
                    "/api/v1/subscriptions/register-trial",
                    json={"email": email, "full_name": "Integration Test"},
                )
                assert register.status_code == 200
                assert register.json()["intentos_usados"] == 0
                assert register.json()["plan_actual"] == "free"

                first = await client.post(
                    "/api/v1/subscriptions/consume-attempt",
                    json={"email": email},
                )
                second = await client.post(
                    "/api/v1/subscriptions/consume-attempt",
                    json={"email": email},
                )
                assert first.status_code == 200
                assert second.status_code == 200
                assert first.json()["intentos_usados"] == 1
                assert second.json()["intentos_usados"] == 2

                # El precheck debe bloquear antes de leer/descomprimir el ZIP.
                blocked_zip = await client.post(
                    "/api/v1/migration-evaluator/evaluate-zip",
                    headers={"X-User-Email": email},
                    files={"file": ("invalid.zip", b"not a zip", "application/zip")},
                )
                assert blocked_zip.status_code == 402
                assert blocked_zip.json()["error"] == "LIMIT_REACHED"
                assert blocked_zip.json()["detail"]["error"] == "LIMIT_REACHED"

                third = await client.post(
                    "/api/v1/subscriptions/consume-attempt",
                    json={"email": email},
                )
                assert third.status_code == 402
                assert third.json()["error"] == "LIMIT_REACHED"
                assert third.json()["detail"]["upgrade_url"] == "/pricing"

                checkout = await client.post(
                    "/api/v1/subscriptions/checkout",
                    json={
                        "email": email,
                        "provider": "stripe",
                        "success_url": "http://localhost:5173/pricing?upgraded=true",
                        "cancel_url": "http://localhost:5173/pricing?canceled=true",
                    },
                )
                assert checkout.status_code == 200
                assert checkout.json()["plan_target"] == "premium"

                webhook = await client.post(
                    "/api/v1/subscriptions/webhook",
                    json={
                        "event_type": "checkout.session.completed",
                        "email": email,
                        "provider": "stripe",
                    },
                )
                assert webhook.status_code == 200
                assert webhook.json()["plan_actual"] == "premium"

                status = await client.get(
                    "/api/v1/subscriptions/status",
                    params={"email": email},
                )
                assert status.status_code == 200
                assert status.json()["plan_actual"] == "premium"
                assert status.json()["can_execute"] is True
            finally:
                db = SessionLocal()
                try:
                    db.query(User).filter(User.email == email).delete()
                    db.commit()
                finally:
                    db.close()


@pytest.mark.asyncio
async def test_advisor_uses_backend_catalog_and_returns_action() -> None:
    """El copiloto no debe responder con costos o propuestas hardcodeadas en React."""
    async with app.router.lifespan_context(app):
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
            response = await client.post(
                "/api/v1/advisor/query",
                json={
                    "query": "Crear arquitectura serverless",
                    "selected_region": "sa-east-1",
                    "selected_services": [],
                    "security_controls": {},
                },
            )

    assert response.status_code == 200
    body = response.json()
    assert body["details_card"]["badge"] == "FinOps calculado"
    assert body["action"]["type"] == "apply_architecture"
    assert body["action"]["payload"]["selectedServices"] == ["S3", "Lambda", "CloudWatch", "IAM"]
    assert body["action"]["payload"]["monthlyBudget"] > 0


@pytest.mark.asyncio
async def test_password_recovery_requires_email_code_and_changes_password() -> None:
    """Valida enlace temporal, código de correo y rechazo de la contraseña anterior."""
    email = f"pytest-reset-{uuid4().hex}@clouddiagnostix.test"
    old_password = "OldPassword2026!"
    new_password = "NewPassword2026!"

    async with app.router.lifespan_context(app):
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
            try:
                with patch("app.api.v1.endpoints.auth.send_email_verification_code"):
                    register = await client.post(
                        "/api/v1/auth/register",
                        json={"email": email, "password": old_password, "full_name": "Password Reset"},
                    )
                assert register.status_code == 201
                with patch("app.api.v1.endpoints.auth.send_password_reset_email") as send_email:
                    requested = await client.post(
                        "/api/v1/auth/password-recovery/request",
                        json={"email": email},
                    )
                    assert requested.status_code == 202
                    reset_url = send_email.call_args.args[1]
                    reset_code = send_email.call_args.args[3]

                token = parse_qs(urlparse(reset_url).query)["token"][0]
                validation = await client.get(
                    "/api/v1/auth/password-recovery/validate",
                    params={"token": token},
                )
                assert validation.status_code == 200
                assert validation.json()["valid"] is True

                confirmed = await client.post(
                    "/api/v1/auth/password-recovery/confirm",
                    json={
                        "token": token,
                        "new_password": new_password,
                        "confirm_password": new_password,
                        "email_code": reset_code,
                    },
                )
                assert confirmed.status_code == 200

                with patch("app.api.v1.endpoints.auth.send_email_verification_code"):
                    old_login = await client.post(
                        "/api/v1/auth/login",
                        json={"email": email, "password": old_password},
                    )
                    new_login = await client.post(
                        "/api/v1/auth/login",
                        json={"email": email, "password": new_password},
                    )
                assert old_login.status_code == 401
                assert new_login.status_code == 200
            finally:
                db = SessionLocal()
                try:
                    user = db.query(User).filter(User.email == email).first()
                    if user:
                        db.query(PasswordResetToken).filter(PasswordResetToken.user_id == user.id).delete()
                        db.delete(user)
                        db.commit()
                finally:
                    db.close()
