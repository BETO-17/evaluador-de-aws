"""
===============================================================================
PROYECTO: Cloud Diagnostix — AWS Cloud Suite Backend
MÓDULO: app/core/security.py
CAPA ARQUITECTÓNICA: Core (Seguridad IAM, JWT y MFA TOTP RFC 6238)
DESCRIPCIÓN:
    Implementa el hashing de contraseñas, la emisión/validación de tokens JWT
    (pre_auth_token y access_token) y la verificación de códigos TOTP de 6 dígitos
    cada 30 segundos (algoritmo HMAC-SHA1 sobre Base32 según RFC 6238).
    Incluye soporte para `pyotp` y motor nativo RFC 6238 de respaldo para
    garantizar funcionamiento continuo (Zero-Failure).
INTEGRACIÓN FRONTEND / BD:
    - Frontend: src/features/modules/aws-cloud/pages/AwsLogin.tsx
    - Base de Datos: Tabla users (columnas password_hash, totp_secret, totp_enabled)
    - Referencia Contexto: context_backend/04_SEGURIDAD_IAM_TOTP_Y_DIAGRAMAS_AWS4.md
===============================================================================
"""

import base64
import hashlib
import hmac
import struct
import time
import urllib.parse
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional

from jose import JWTError, jwt

from app.core.config import settings

try:
    import pyotp  # type: ignore
except ImportError:
    pyotp = None


# ==========================================================
# 1. GESTIÓN DE CONTRASEÑAS (HASHING SEGURO PBKDF2-HMAC-SHA256)
# ==========================================================
def get_password_hash(password: str) -> str:
    """
    Genera el hash criptográfico de una contraseña en texto plano usando
    PBKDF2-HMAC-SHA256 con 120,000 iteraciones.
    """
    salt = "clouddiagnostix_aws_salt_2026"
    dk = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt.encode("utf-8"),
        120_000,
    )
    return f"pbkdf2_sha256${salt}${dk.hex()}"


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verifica una contraseña en texto plano contra su hash almacenado en la tabla `users`.
    """
    if not hashed_password:
        return False
    expected = get_password_hash(plain_password)
    return hmac.compare_digest(expected, hashed_password)


# ==========================================================
# 2. AUTENTICACIÓN MFA TOTP (RFC 6238 — 6 DÍGITOS, 30 SEGUNDOS)
# ==========================================================
def _rfc6238_hotp(secret_base32: str, counter: int, digits: int = 6) -> str:
    """
    Implementación criptográfica exacta del estándar RFC 4226 / RFC 6238 (HMAC-SHA1)
    sobre clave Base32. Produce exactamente el mismo código de 6 dígitos que `pyotp`
    y el frontend `AwsLogin.tsx`.
    """
    missing_padding = len(secret_base32) % 8
    if missing_padding:
        secret_base32 += "=" * (8 - missing_padding)
    key = base64.b32decode(secret_base32, casefold=True)
    msg = struct.pack(">Q", counter)
    digest = hmac.new(key, msg, hashlib.sha1).digest()
    offset = digest[-1] & 0x0F
    code_int = (struct.unpack(">I", digest[offset : offset + 4])[0] & 0x7FFFFFFF) % (10**digits)
    return str(code_int).zfill(digits)


def verify_totp_code(secret_base32: Optional[str], code: str) -> bool:
    """
    Verifica el código numérico TOTP de 6 dígitos (RFC 6238).

    Parámetros:
        secret_base32: Clave secreta en Base32 (por defecto 'JBSWY3DPEHPK3PXP').
        code: Código de 6 dígitos ingresado por el arquitecto cloud.

    Retorna:
        True si el código es válido en la ventana actual o adyacente (±30s).
    """
    clean_secret = (secret_base32 or settings.DEFAULT_TOTP_SECRET).replace(" ", "").upper()
    clean_code = (code or "").strip().replace(" ", "")
    if not clean_code.isdigit() or len(clean_code) != 6:
        return False

    # [REGLA DE NEGOCIO - TOTP RFC 6238]:
    # valid_window=1 acepta la ventana actual de 30s y ±1 ventana adyacente para
    # evitar rechazos por desfases de milisegundos entre el reloj del navegador
    # (AwsLogin.tsx) y el servidor FastAPI.
    if pyotp is not None:
        totp = pyotp.TOTP(clean_secret, digits=6, interval=30)
        return bool(totp.verify(clean_code, valid_window=1))

    current_step = int(time.time() // 30)
    for window_offset in (-1, 0, 1):
        candidate = _rfc6238_hotp(clean_secret, current_step + window_offset, digits=6)
        if hmac.compare_digest(candidate, clean_code):
            return True
    return False


def generate_current_totp_code(secret_base32: Optional[str] = None) -> str:
    """
    Genera el código TOTP de 6 dígitos vigente en este instante (ventana de 30s).
    """
    clean_secret = (secret_base32 or settings.DEFAULT_TOTP_SECRET).replace(" ", "").upper()
    if pyotp is not None:
        totp = pyotp.TOTP(clean_secret, digits=6, interval=30)
        return totp.now()
    current_step = int(time.time() // 30)
    return _rfc6238_hotp(clean_secret, current_step, digits=6)


def get_provisioning_uri(email: str, secret_base32: Optional[str] = None) -> str:
    """
    Construye la URI `otpauth://totp/...` compatible con Google Authenticator y Authy.
    """
    clean_secret = (secret_base32 or settings.DEFAULT_TOTP_SECRET).replace(" ", "").upper()
    if pyotp is not None:
        totp = pyotp.TOTP(clean_secret, digits=6, interval=30)
        return totp.provisioning_uri(name=email, issuer_name="Cloud Diagnostix AWS")
    issuer = urllib.parse.quote("Cloud Diagnostix AWS")
    label = urllib.parse.quote(f"Cloud Diagnostix AWS:{email}")
    return f"otpauth://totp/{label}?secret={clean_secret}&issuer={issuer}&algorithm=SHA1&digits=6&period=30"


def generate_totp_secret() -> str:
    """Genera un secreto Base32 independiente para cada cuenta nueva."""
    if pyotp is not None:
        return pyotp.random_base32()
    raw = hashlib.sha256(f"{time.time_ns()}".encode("utf-8")).digest()
    return base64.b32encode(raw).decode("ascii").rstrip("=")[:32]


# ==========================================================
# 3. EMISIÓN Y DECODIFICACIÓN DE TOKENS JWT (PRE-AUTH & ACCESS)
# ==========================================================
def create_jwt_token(
    subject: str,
    extra_claims: Optional[Dict[str, Any]] = None,
    expires_delta: Optional[timedelta] = None,
) -> str:
    """
    Genera un token JWT firmado con HS256.
    Se utiliza tanto para el `pre_auth_token` (10 min, antes del segundo factor TOTP)
    como para el `access_token` definitivo (480 min / 8 horas).
    """
    now = datetime.now(timezone.utc)
    expire = now + (expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES))
    payload: Dict[str, Any] = {
        "sub": str(subject),
        "iat": int(now.timestamp()),
        "exp": int(expire.timestamp()),
    }
    if extra_claims:
        payload.update(extra_claims)

    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def decode_jwt_token(token: str) -> Optional[Dict[str, Any]]:
    """
    Decodifica y valida la firma y expiración de un token JWT.
    Retorna el diccionario de claims o None si el token es inválido/expirado.
    """
    try:
        return jwt.decode(
            token,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM],
        )
    except JWTError:
        return None
