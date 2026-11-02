"""
===============================================================================
PROYECTO: Cloud Diagnostix — AWS Cloud Suite Backend
MÓDULO: app/api/v1/endpoints/auth.py
CAPA ARQUITECTÓNICA: API v1 (Autenticación JWT y código temporal por correo)
DESCRIPCIÓN:
    Expone los endpoints `/api/v1/auth/login` y `/api/v1/auth/verify-email-code` para
    el flujo de autenticación con un código de correo de 6 dígitos, devolviendo
    además el estado Freemium (`intentos_usados` y `plan_actual`) del usuario.
INTEGRACIÓN FRONTEND / BD:
    - Frontend: src/features/modules/aws-cloud/pages/AwsLogin.tsx
    - Base de Datos: Tabla `users`
    - Referencia Contexto: context_backend/02_CONTRATOS_API_REST_ENDPOINTS.md y plan_suscripcion.txt
===============================================================================
"""

import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.core.security import create_jwt_token, decode_jwt_token, get_password_hash, verify_password
from app.models.email_verification_code import EmailVerificationCode
from app.models.password_reset_token import PasswordResetToken
from app.models.user import User
from app.schemas.auth_schema import (
    LoginPreAuthResponse,
    LoginRequest,
    PasswordActionResponse,
    PasswordRecoveryConfirmRequest,
    PasswordRecoveryRequest,
    PasswordRecoveryValidateResponse,
    RegisterRequest,
    RegisterResponse,
    EmailCodeVerifyRequest,
    EmailCodeVerifyResponse,
    UserSummarySchema,
)
from app.services.email_service import send_email_verification_code, send_password_reset_email


def _build_user_summary(user: User) -> UserSummarySchema:
    """Serializa el usuario sin exponer el hash de la contraseña ni secretos."""
    return UserSummarySchema(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        role=user.role,
        theme_preference=user.theme_preference,
        intentos_usados=int(user.intentos_usados or 0),
        plan_actual=user.plan_actual or "free",
    )


def _build_pre_auth_token(user: User) -> str:
    """Emite el token temporal que habilita exclusivamente el paso por correo."""
    return create_jwt_token(
        subject=user.id,
        extra_claims={"email": user.email, "stage": "pre_auth_email_code"},
        expires_delta=timedelta(minutes=10),
    )

router = APIRouter(prefix="/auth", tags=["Autenticación IAM & código de correo"])


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _hash_reset_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def _email_hint(email: str) -> str:
    local, _, domain = email.partition("@")
    return f"{local[:2]}{'*' * max(len(local) - 2, 1)}@{domain}"


def _token_expired(row: PasswordResetToken, now: datetime) -> bool:
    expires_at = row.expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    return expires_at < now


def _code_hash(code: str) -> str:
    return hashlib.sha256(code.encode("utf-8")).hexdigest()


def _issue_email_code(user: User, purpose: str, request: Request, db: Session) -> str:
    now = _utcnow()
    db.query(EmailVerificationCode).filter(
        EmailVerificationCode.user_id == user.id,
        EmailVerificationCode.purpose == purpose,
        EmailVerificationCode.used_at.is_(None),
    ).update({EmailVerificationCode.used_at: now}, synchronize_session=False)
    code = f"{secrets.randbelow(1_000_000):06d}"
    db.add(
        EmailVerificationCode(
            user_id=user.id,
            purpose=purpose,
            code_hash=_code_hash(code),
            expires_at=now + timedelta(minutes=settings.EMAIL_CODE_EXPIRATION_MINUTES),
            requested_ip=request.client.host if request.client else None,
        )
    )
    db.commit()
    return code


def _verify_email_code(user: User, code: str, purpose: str, db: Session) -> bool:
    row = (
        db.query(EmailVerificationCode)
        .filter(
            EmailVerificationCode.user_id == user.id,
            EmailVerificationCode.purpose == purpose,
            EmailVerificationCode.used_at.is_(None),
        )
        .order_by(EmailVerificationCode.created_at.desc())
        .first()
    )
    now = _utcnow()
    if not row or row.attempts >= settings.EMAIL_CODE_MAX_ATTEMPTS:
        return False
    expires_at = row.expires_at.replace(tzinfo=timezone.utc) if row.expires_at.tzinfo is None else row.expires_at
    row.attempts += 1
    valid = expires_at >= now and secrets.compare_digest(row.code_hash, _code_hash(code.strip()))
    if valid:
        row.used_at = now
    db.commit()
    return valid


# ==========================================================
# 1. ENDPOINT DE LOGIN (PASO 1: CREDENCIALES + PRE-AUTH TOKEN)
# ==========================================================
@router.post(
    "/login",
    response_model=LoginPreAuthResponse,
    summary="Valida credenciales y envía un código de 6 dígitos por correo",
)
async def login_endpoint(
    payload: LoginRequest,
    request: Request,
    db: Session = Depends(get_db),
) -> LoginPreAuthResponse:
    """
    Verifica correo y contraseña del arquitecto cloud.
    Si el usuario existe en la base de datos y las credenciales son válidas,
    emite un `pre_auth_token` temporal de 10 minutos que exige la verificación
    del código de correo de 6 dígitos en `/api/v1/auth/verify-email-code`.

    Errores HTTP:
        - `401 Unauthorized`: Credenciales inválidas.
    """
    email_clean = payload.email.strip().lower()
    user = db.query(User).filter(User.email == email_clean).first()

    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales inválidas. Verifique correo y contraseña.",
        )

    pre_auth_token = _build_pre_auth_token(user)
    code = _issue_email_code(user, "login", request, db)
    send_email_verification_code(user.email, code, "login", settings.EMAIL_CODE_EXPIRATION_MINUTES)

    return LoginPreAuthResponse(
        requires_email_code=True,
        pre_auth_token=pre_auth_token,
        user=_build_user_summary(user),
    )


# ==========================================================
# 2. ENDPOINT DE VERIFICACIÓN POR CORREO (PASO 2)
# ==========================================================
@router.post(
    "/register",
    response_model=RegisterResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Crea una cuenta de arquitecto y envía un código de verificación",
)
async def register_endpoint(
    payload: RegisterRequest,
    request: Request,
    db: Session = Depends(get_db),
) -> RegisterResponse:
    """Crea una cuenta real para que el frontend no dependa de usuarios simulados."""
    email_clean = payload.email.strip().lower()
    if db.query(User).filter(User.email == email_clean).first():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="El correo ya está registrado.")

    user = User(
        email=email_clean,
        full_name=payload.full_name.strip(),
        password_hash=get_password_hash(payload.password),
        role=payload.role.strip() or "AWS Solutions Architect",
        totp_enabled=False,
        intentos_usados=0,
        plan_actual="free",
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    code = _issue_email_code(user, "login", request, db)
    send_email_verification_code(user.email, code, "login", settings.EMAIL_CODE_EXPIRATION_MINUTES)

    return RegisterResponse(
        requires_email_code=True,
        pre_auth_token=_build_pre_auth_token(user),
        user=_build_user_summary(user),
    )


@router.post(
    "/password-recovery/request",
    response_model=PasswordActionResponse,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Solicita un enlace temporal para recuperar la contraseña",
)
async def request_password_recovery(
    payload: PasswordRecoveryRequest,
    request: Request,
    db: Session = Depends(get_db),
) -> PasswordActionResponse:
    """Crea un token de un solo uso sin revelar si el correo existe."""
    generic_message = "Si el correo está registrado, recibirás instrucciones para recuperar tu contraseña."
    email_clean = payload.email.strip().lower()
    user = db.query(User).filter(User.email == email_clean).first()
    if not user:
        return PasswordActionResponse(message=generic_message)

    now = _utcnow()
    recent_count = (
        db.query(PasswordResetToken)
        .filter(
            PasswordResetToken.user_id == user.id,
            PasswordResetToken.created_at >= now - timedelta(minutes=15),
        )
        .count()
    )
    if recent_count >= 3:
        return PasswordActionResponse(message=generic_message)

    db.query(PasswordResetToken).filter(
        PasswordResetToken.user_id == user.id,
        PasswordResetToken.used_at.is_(None),
    ).update({PasswordResetToken.used_at: now}, synchronize_session=False)

    raw_token = secrets.token_urlsafe(32)
    expires_at = now + timedelta(minutes=settings.PASSWORD_RESET_TOKEN_MINUTES)
    db.add(
        PasswordResetToken(
            user_id=user.id,
            token_hash=_hash_reset_token(raw_token),
            expires_at=expires_at,
            requested_ip=request.client.host if request.client else None,
        )
    )
    db.commit()

    reset_url = f"{settings.FRONTEND_PUBLIC_URL.rstrip('/')}/login/reset-password?token={raw_token}"
    code = _issue_email_code(user, "password_recovery", request, db)
    send_password_reset_email(user.email, reset_url, settings.PASSWORD_RESET_TOKEN_MINUTES, code)
    return PasswordActionResponse(message=generic_message)


@router.get(
    "/password-recovery/validate",
    response_model=PasswordRecoveryValidateResponse,
    summary="Valida un token temporal de recuperación",
)
async def validate_password_recovery_token(
    token: str,
    db: Session = Depends(get_db),
) -> PasswordRecoveryValidateResponse:
    row = db.query(PasswordResetToken).filter(PasswordResetToken.token_hash == _hash_reset_token(token)).first()
    now = _utcnow()
    if not row or row.used_at is not None or _token_expired(row, now):
        return PasswordRecoveryValidateResponse(valid=False, message="El enlace es inválido o ya expiró. Solicita uno nuevo.")
    return PasswordRecoveryValidateResponse(
        valid=True,
        email_hint=_email_hint(row.user.email),
        expires_at=row.expires_at,
        message="Token válido.",
    )


@router.post(
    "/password-recovery/confirm",
    response_model=PasswordActionResponse,
    summary="Cambia la contraseña con token temporal y código de correo",
)
async def confirm_password_recovery(
    payload: PasswordRecoveryConfirmRequest,
    db: Session = Depends(get_db),
) -> PasswordActionResponse:
    if payload.new_password != payload.confirm_password:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Las contraseñas nuevas no coinciden.")

    row = db.query(PasswordResetToken).filter(PasswordResetToken.token_hash == _hash_reset_token(payload.token)).first()
    now = _utcnow()
    if not row or row.used_at is not None or _token_expired(row, now):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="El enlace es inválido o ya expiró. Solicita uno nuevo.")

    user = row.user
    if not _verify_email_code(user, payload.email_code, "password_recovery", db):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="El código de correo no es válido o expiró.")

    user.password_hash = get_password_hash(payload.new_password)
    user.password_changed_at = now
    user.token_version = int(user.token_version or 0) + 1
    row.used_at = now
    db.commit()
    return PasswordActionResponse(message="Contraseña actualizada. Inicia sesión nuevamente.")


@router.post(
    "/verify-email-code",
    response_model=EmailCodeVerifyResponse,
    summary="Verifica código de correo de 6 dígitos y emite JWT definitivo",
)
async def verify_email_code_endpoint(
    payload: EmailCodeVerifyRequest,
    db: Session = Depends(get_db),
) -> EmailCodeVerifyResponse:
    """
    Verifica el código de 6 dígitos enviado al correo para el usuario del token temporal.

    Errores HTTP:
        - `401 Unauthorized`: Código inválido, usado o expirado.
    """
    claims = decode_jwt_token(payload.pre_auth_token)
    user = db.query(User).filter(User.id == str(claims.get("sub"))).first() if claims and claims.get("sub") else None
    if not user or not claims or claims.get("stage") != "pre_auth_email_code":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token temporal inválido o expirado.")
    if not _verify_email_code(user, payload.email_code, "login", db):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="El código de correo no es válido o expiró.")

    user_summary = UserSummarySchema(
        id=user.id if user else "b3d7a104-8b2f-4e1a-9a10-123456789abc",
        email=user.email if user else "arquitecto@clouddiagnostix.aws",
        full_name=user.full_name if user else "Jorge Mendoza · Cloud Architect",
        role=user.role if user else "AWS Solutions Architect",
        theme_preference=user.theme_preference if user else "light",
        intentos_usados=int(user.intentos_usados or 0) if user else 0,
        plan_actual=(user.plan_actual or "free") if user else "free",
    )

    access_token = create_jwt_token(
        subject=user_summary.id or user_summary.email,
        extra_claims={
            "email": user_summary.email,
            "role": user_summary.role,
            "plan_actual": user_summary.plan_actual,
            "email_code_verified": True,
            "token_version": int(user.token_version or 0) if user else 0,
        },
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
    )

    return EmailCodeVerifyResponse(
        verified=True,
        timestamp=datetime.now(timezone.utc).isoformat(),
        access_token=access_token,
        token_type="bearer",
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user=user_summary,
    )

