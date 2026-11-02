"""
===============================================================================
PROYECTO: Cloud Diagnostix — AWS Cloud Suite Backend
MÓDULO: app/main.py
CAPA ARQUITECTÓNICA: Bootstrap Principal FastAPI
DESCRIPCIÓN:
    Punto de entrada principal de la aplicación FastAPI. Configura CORS para el
    frontend Vite/React, registra el manejador de excepciones del Gatekeeper
    Freemium (`HTTP 402 LIMIT_REACHED`), inicializa automáticamente las 7 tablas
    en SQLAlchemy 2.0 (incluyendo migración en caliente de `intentos_usados` y
    `plan_actual`), siembra únicamente el usuario arquitecto por defecto y monta `/api/v1`.
INTEGRACIÓN FRONTEND / BD:
    - Frontend: Detección automática en puertos `8080` y `8000` (`analyzerService.ts`)
    - Base de Datos: PostgreSQL 16 o SQLite local (`clouddiagnostix.db`)
    - Referencia Contexto: context_backend/00_README_ARQUITECTURA_BACKEND.md y plan_suscripcion.txt
===============================================================================
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text

from app.api.v1.router import api_v1_router
from app.core.config import settings
from app.core.database import Base, SessionLocal, engine
from app.core.security import get_password_hash
from app.models import (
    CloudProposal,
    User,
)
from app.services.subscription_gatekeeper import LimitReachedHTTPException


# ==========================================================
# 1. INICIALIZACIÓN DE TABLAS, MIGRACIÓN SUAVE Y USUARIO DE DESARROLLO
# ==========================================================
def _ensure_freemium_columns_exist() -> None:
    """
    Garantiza que si existe una base de datos SQLite/PostgreSQL previa sin las
    columnas `intentos_usados` o `plan_actual` en `users`, se agreguen de forma
    automática e idempotente al arrancar.
    """
    with engine.connect() as conn:
        for ddl in (
            "ALTER TABLE users ADD COLUMN intentos_usados INTEGER NOT NULL DEFAULT 0",
            "ALTER TABLE users ADD COLUMN plan_actual VARCHAR(20) NOT NULL DEFAULT 'free'",
            "ALTER TABLE users ADD COLUMN password_changed_at TIMESTAMP NULL",
            "ALTER TABLE users ADD COLUMN token_version INTEGER NOT NULL DEFAULT 0",
            "ALTER TABLE proposal_rea_evaluations ADD COLUMN ai_generated BOOLEAN NOT NULL DEFAULT 0",
            "ALTER TABLE proposal_rea_evaluations ADD COLUMN ai_provider VARCHAR(80) NULL",
            "ALTER TABLE proposal_rea_evaluations ADD COLUMN system_description TEXT NULL",
        ):
            try:
                conn.execute(text(ddl))
                conn.commit()
            except Exception:
                pass


def init_db_and_seed() -> None:
    """
    Crea las tablas del esquema si no existen y siembra únicamente:
    1. El usuario arquitecto de desarrollo (`arquitecto@clouddiagnostix.aws` / `AdminAws2026!`)
       con secreto TOTP RFC 6238 `JBSWY3DPEHPK3PXP`, `intentos_usados = 0` y
       `plan_actual = 'free'`.
    Las propuestas solo se crean después de evaluar un proyecto real desde el frontend.
    """
    Base.metadata.create_all(bind=engine)
    _ensure_freemium_columns_exist()

    db = SessionLocal()
    try:
        # 1. Sembrar usuario arquitecto por defecto
        default_email = "arquitecto@clouddiagnostix.aws"
        architect = db.query(User).filter(User.email == default_email).first()
        if not architect:
            architect = User(
                id="b3d7a104-8b2f-4e1a-9a10-123456789abc",
                email=default_email,
                full_name="Jorge Mendoza · Cloud Architect",
                password_hash=get_password_hash("AdminAws2026!"),
                role="AWS Solutions Architect",
                totp_secret=settings.DEFAULT_TOTP_SECRET,
                totp_enabled=False,
                theme_preference="light",
                intentos_usados=0,
                plan_actual="free",
            )
            db.add(architect)
            db.flush()

        # Retira la propuesta fixture que se sembraba en versiones anteriores.
        # Las propuestas nuevas deben provenir de una evaluación real del proyecto.
        legacy_demo = db.query(CloudProposal).filter(CloudProposal.id == "c4e8b215-9c3a-4f2b-8b21-987654321def").first()
        if legacy_demo:
            db.delete(legacy_demo)

        db.commit()
    finally:
        db.close()


@asynccontextmanager
async def lifespan(_app: FastAPI):
    """Ciclo de vida de arranque y apagado del servidor FastAPI."""
    init_db_and_seed()
    yield


# ==========================================================
# 2. INSTANCIA FASTAPI Y CONFIGURACIÓN DE MIDDLEWARE CORS
# ==========================================================
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description=(
        "API REST para Evaluación de Migración AWS (Motor REA), Gatekeeper Freemium "
        "(2 intentos gratuitos + conversión a Premium), Seguridad IAM (0-100 pts), "
        "Calculadora FinOps (19 servicios AWS), autenticación por código de correo y "
        "Generación de Diagramas Draw.io con stencils oficiales mxgraph.aws4."
    ),
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ==========================================================
# 3. MANEJADOR DEL GATEKEEPER FREEMIUM (HTTP 402 LIMIT_REACHED)
# ==========================================================
@app.exception_handler(LimitReachedHTTPException)
async def limit_reached_exception_handler(
    _request: Request,
    exc: LimitReachedHTTPException,
) -> JSONResponse:
    """
    Formatea la respuesta HTTP 402 (Payment Required) incluyendo `{"error": "LIMIT_REACHED"}`
    tanto en la raíz del JSON como en `detail` para garantizar compatibilidad 100%
    con cualquier interceptor de red en React + TypeScript (`plan_suscripcion.txt`).
    """
    return JSONResponse(
        status_code=exc.status_code,
        content={
            **exc.payload,
            "detail": exc.payload,
        },
    )


# Montar todas las rutas bajo /api/v1
app.include_router(api_v1_router)


# ==========================================================
# 4. ENDPOINT RAÍZ INFORMATIVO
# ==========================================================
@app.get("/", tags=["Root & Health"])
async def root_info():
    """Ruta raíz informativa con enlaces a la documentación OpenAPI y salud del Motor REA."""
    return {
        "application": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "online",
        "docs_url": "/docs",
        "rea_status_endpoint": "/api/v1/migration-evaluator/status",
        "subscriptions_endpoint": "/api/v1/subscriptions/status",
        "mcp_drawio_server": ".agents/skills/drawio-aws4-mcp/scripts/drawio_aws4_mcp_server.py",
    }
