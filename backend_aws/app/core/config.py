"""
===============================================================================
PROYECTO: Cloud Diagnostix — AWS Cloud Suite Backend
MÓDULO: app/core/config.py
CAPA ARQUITECTÓNICA: Core (Configuración)
DESCRIPCIÓN:
    Centraliza las variables de entorno del servidor FastAPI, CORS, conexión a
    PostgreSQL/SQLite, secretos JWT + TOTP (RFC 6238) y credenciales de Gemini AI.
INTEGRACIÓN FRONTEND / BD:
    - Frontend: src/features/modules/aws-cloud/services/analyzerService.ts (puertos 8080/8000)
    - Base de Datos: PostgreSQL 16 o SQLite local (clouddiagnostix.db)
    - Referencia Contexto: context_backend/00_README_ARQUITECTURA_BACKEND.md
===============================================================================
"""

from pathlib import Path
from typing import List
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


BACKEND_ENV_FILE = Path(__file__).resolve().parents[2] / ".env"


# ==========================================================
# 1. DEFINICIÓN DE AJUSTES DE ENTORNO (PYDANTIC SETTINGS)
# ==========================================================
class Settings(BaseSettings):
    """
    Esquema tipado de configuración global cargado desde variables de entorno o `.env`.
    Provee valores por defecto seguros para ejecución inmediata en desarrollo.
    """

    # Metadatos del microservicio FastAPI
    APP_NAME: str = "Cloud Diagnostix — AWS Backend & REA Engine"
    APP_VERSION: str = "1.0.0"
    HOST: str = "0.0.0.0"
    PORT: int = 8080
    DEBUG: bool = True

    # Orígenes permitidos por CORS (Frontend React/Vite en 5173 o 3000)
    CORS_ORIGINS: str = "http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000,*"

    # Conexión a Base de Datos (PostgreSQL 16 en producción o SQLite local)
    DATABASE_URL: str = "sqlite:///./clouddiagnostix.db"

    # Seguridad JWT & Doble Factor TOTP (RFC 6238)
    JWT_SECRET_KEY: str = "clouddiagnostix_aws_super_secret_key_256_bits_2026_rea_engine"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480
    # [REGLA DE NEGOCIO - TOTP]: Clave Base32 oficial de demo compatible con AwsLogin.tsx
    DEFAULT_TOTP_SECRET: str = "JBSWY3DPEHPK3PXP"

    # Motor de IA para Evaluación REA (Google Gemini API)
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-3.8-flash"
    CLAUDE_API_KEY: str = ""
    CLAUDE_MODEL: str = "claude-sonnet-5"

    # Token opcional para inspección de repositorios en GitHub API
    GITHUB_API_TOKEN: str = ""

    # Recuperación de contraseña por enlace temporal
    FRONTEND_PUBLIC_URL: str = "http://localhost:5173"
    PASSWORD_RESET_TOKEN_MINUTES: int = 15
    EMAIL_CODE_EXPIRATION_MINUTES: int = 10
    EMAIL_CODE_MAX_ATTEMPTS: int = 5
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USE_SSL: bool = False
    SMTP_USE_TLS: bool = True
    EMAIL_USER: str = ""
    EMAIL_PASSWORD: str = ""
    EMAIL_FROM: str = ""

    model_config = SettingsConfigDict(
        env_file=BACKEND_ENV_FILE,
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @field_validator("DEBUG", mode="before")
    @classmethod
    def parse_debug_flag(cls, value):
        """
        Normaliza DEBUG para tolerar valores de plataformas como ``release``.

        Algunas plataformas inyectan ``DEBUG=release`` como etiqueta de entorno;
        ese valor debe interpretarse como ``False`` y no impedir que FastAPI arranque.
        """
        if isinstance(value, str):
            return value.strip().lower() in {"1", "true", "yes", "on", "debug", "development"}
        return value

    @property
    def cors_origins_list(self) -> List[str]:
        """Convierte la cadena separada por comas de CORS_ORIGINS en una lista para FastAPI."""
        origins = [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]
        return origins if origins else ["*"]


# Instancia singleton de configuración importable por todas las capas
settings = Settings()

