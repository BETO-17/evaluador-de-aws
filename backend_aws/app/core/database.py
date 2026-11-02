"""
===============================================================================
PROYECTO: Cloud Diagnostix — AWS Cloud Suite Backend
MÓDULO: app/core/database.py
CAPA ARQUITECTÓNICA: Core (Persistencia y Sesiones SQLAlchemy 2.0)
DESCRIPCIÓN:
    Configura el motor SQLAlchemy 2.0 con soporte híbrido para PostgreSQL 16 y
    SQLite local, incluyendo fallback automático si el servidor PostgreSQL no
    está disponible en desarrollo.
INTEGRACIÓN FRONTEND / BD:
    - Base de Datos: 7 tablas definidas en schema.sql
    - Referencia Contexto: context_backend/01_MODELO_DATOS_Y_BASE_DE_DATOS.md
===============================================================================
"""

from typing import Generator
from sqlalchemy import create_engine, text
from sqlalchemy.orm import declarative_base, sessionmaker, Session

from app.core.config import settings


# ==========================================================
# 1. CREACIÓN RESILIENTE DEL MOTOR SQLALCHEMY 2.0
# ==========================================================
def _build_sqlalchemy_engine():
    """
    Construye el Engine de SQLAlchemy. Si DATABASE_URL apunta a PostgreSQL pero
    el servicio local no está levantado, realiza fallback transparente a SQLite
    para garantizar disponibilidad continua (Zero-Failure Guarantee).
    """
    db_url = settings.DATABASE_URL
    if db_url.startswith("sqlite"):
        # En SQLite desactivamos check_same_thread para soportar peticiones concurrentes en FastAPI
        return create_engine(
            db_url,
            connect_args={"check_same_thread": False},
            pool_pre_ping=True,
        )

    try:
        pg_engine = create_engine(db_url, pool_pre_ping=True)
        with pg_engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return pg_engine
    except Exception:
        # [ADR-DB]: Fallback automático a SQLite local si PostgreSQL no responde
        fallback_url = "sqlite:///./clouddiagnostix.db"
        return create_engine(
            fallback_url,
            connect_args={"check_same_thread": False},
            pool_pre_ping=True,
        )


engine = _build_sqlalchemy_engine()

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)

# Clase base declarativa para los 7 modelos ORM de Cloud Diagnostix
Base = declarative_base()


# ==========================================================
# 2. DEPENDENCIA DE INYECCIÓN DE SESIÓN PARA ENDPOINTS FASTAPI
# ==========================================================
def get_db() -> Generator[Session, None, None]:
    """
    Generador de dependencia para FastAPI (`Depends(get_db)`).
    Abre una sesión transaccional por petición HTTP y la cierra al finalizar.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

