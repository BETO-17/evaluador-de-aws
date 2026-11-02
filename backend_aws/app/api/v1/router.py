"""
===============================================================================
PROYECTO: Cloud Diagnostix — AWS Cloud Suite Backend
MÓDULO: app/api/v1/router.py
CAPA ARQUITECTÓNICA: API v1 (Agrupador Central de Rutas `/api/v1`)
DESCRIPCIÓN:
    Ensambla todos los routers de dominio (`auth`, `migration_rea`, `proposals`,
    `security`, `costs`, `regions`, `diagrams`, `subscriptions`) bajo el prefijo
    `/api/v1`.
INTEGRACIÓN FRONTEND / BD:
    - Frontend: Conecta 1:1 con `http://localhost:8080/api/v1` y `8000`
    - Referencia Contexto: context_backend/02_CONTRATOS_API_REST_ENDPOINTS.md y plan_suscripcion.txt
===============================================================================
"""

from fastapi import APIRouter

from app.api.v1.endpoints import (
    advisor,
    auth,
    costs,
    diagrams,
    migration_rea,
    proposals,
    regions,
    security,
    subscriptions,
)

# ==========================================================
# 1. ENSAMBLAJE DE ROUTERS BAJO /api/v1
# ==========================================================
api_v1_router = APIRouter(prefix="/api/v1")

api_v1_router.include_router(advisor.router)
api_v1_router.include_router(migration_rea.router)
api_v1_router.include_router(auth.router)
api_v1_router.include_router(subscriptions.router)
api_v1_router.include_router(proposals.router)
api_v1_router.include_router(security.router)
api_v1_router.include_router(costs.router)
api_v1_router.include_router(regions.router)
api_v1_router.include_router(diagrams.router)
