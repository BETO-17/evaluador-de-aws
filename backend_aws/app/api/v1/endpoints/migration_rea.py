"""
===============================================================================
PROYECTO: Cloud Diagnostix — AWS Cloud Suite Backend
MÓDULO: app/api/v1/endpoints/migration_rea.py
CAPA ARQUITECTÓNICA: API v1 (Endpoints del Motor Evaluador REA + Gatekeeper Freemium)
DESCRIPCIÓN:
    Expone los 3 endpoints consumidos directamente por `analyzerService.ts`:
    1. `GET /api/v1/migration-evaluator/status` (Health check y estado de Gemini)
    2. `POST /api/v1/migration-evaluator/evaluate-zip` (Auditoría de paquete .zip)
    3. `POST /api/v1/migration-evaluator/evaluate-github` (Auditoría de GitHub)
    Integra el Gatekeeper de Suscripción Freemium (`plan_suscripcion.txt`) para
    validar `plan_actual` e `intentos_usados` (< 2) ANTES de ejecutar la IA.
INTEGRACIÓN FRONTEND / BD:
    - Frontend: `analyzerService.ts` y `subscriptionInterceptor.ts`
    - Base de Datos: Tabla `users` (`intentos_usados`, `plan_actual`)
    - Referencia Contexto: context_backend/02_CONTRATOS_API_REST_ENDPOINTS.md y plan_suscripcion.txt
===============================================================================
"""

from typing import Optional
import zipfile
from fastapi import APIRouter, Depends, File, Form, Header, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.schemas.rea_schema import (
    DocumentEvalRequest,
    EnterpriseEvaluationResponse,
    EvaluatorStatusResponse,
    GithubEvalRequest,
)
from app.services.project_inspector import ProjectInspectionError, inspect_document_text, inspect_github_repository, inspect_zip_bytes
from app.services.rea_engine import build_rea_evaluation
from app.services.subscription_gatekeeper import (
    consume_gatekeeper_attempt,
    resolve_user_email,
    validate_gatekeeper_precheck,
)

router = APIRouter(prefix="/migration-evaluator", tags=["Motor Evaluador REA & IA"])

# Límite máximo de paquete .zip en memoria: 50 MB
MAX_ZIP_SIZE_BYTES = 50 * 1024 * 1024


# ==========================================================
# 1. SALUD DEL MOTOR REA (`GET /api/v1/migration-evaluator/status`)
# ==========================================================
@router.get(
    "/status",
    response_model=EvaluatorStatusResponse,
    summary="Verifica que el backend y el Motor Evaluador REA estén en línea",
)
async def get_evaluator_status() -> EvaluatorStatusResponse:
    """
    Endpoint consultado automáticamente por `analyzerService.ts` en los puertos
    `8080` y `8000` al abrir el módulo de Planificación Cloud.
    """
    provider = "Claude" if settings.CLAUDE_API_KEY else "Gemini" if settings.GEMINI_API_KEY else "REA Heuristic Engine"
    return EvaluatorStatusResponse(
        status="online",
        service="Cloud Diagnostix REA Evaluator",
        ai_engine=f"{provider} + REA Engine",
        gemini_active=bool(settings.GEMINI_API_KEY),
        ai_provider=provider,
    )


# ==========================================================
# 2. AUDITORÍA DE ARCHIVO .ZIP (`POST /api/v1/migration-evaluator/evaluate-zip`)
# ==========================================================
@router.post(
    "/evaluate-zip",
    response_model=EnterpriseEvaluationResponse,
    summary="Inspecciona un archivo .zip y genera la evaluación arquitectónica REA (con Gatekeeper Freemium)",
)
async def evaluate_zip_project(
    file: UploadFile = File(..., description="Archivo .zip con el código fuente del proyecto (máx. 50 MB)"),
    traffic_tier: str = Form("medium"),
    target_region: str = Form("sa-east-1"),
    custom_notes: Optional[str] = Form(None),
    email: Optional[str] = Form(None, description="Correo opcional para control de 2 intentos gratuitos"),
    x_user_email: Optional[str] = Header(None, alias="X-User-Email"),
    authorization: Optional[str] = Header(None, alias="Authorization"),
    db: Session = Depends(get_db),
):
    """
    Recibe un paquete `.zip` vía `multipart/form-data`.
    1. Si se proporciona correo (`email`, `X-User-Email` o token JWT), ejecuta
       primero el **Gatekeeper Freemium** (`plan_suscripcion.txt`):
       - Si `plan_actual == 'free'` y `intentos_usados >= 2`, bloquea la petición
         **antes** de procesar el `.zip` y devuelve `HTTP 402 Payment Required`
         con `{"error": "LIMIT_REACHED"}`.
    2. Inspecciona el `.zip` en memoria RAM y construye los 3 escenarios REA.
    3. Incrementa `intentos_usados += 1` y retorna `200 OK`.
    """
    resolved_email = resolve_user_email(email, x_user_email, authorization)
    trial_user = None

    # [REGLA DE NEGOCIO - GATEKEEPER PRE-CHECK]:
    # Se valida ANTES de leer o descomprimir el archivo para no consumir recursos si ya alcanzó 2 intentos.
    if resolved_email:
        trial_user = validate_gatekeeper_precheck(db, resolved_email)

    raw_bytes = await file.read()
    if len(raw_bytes) > MAX_ZIP_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El paquete .zip excede el tamaño máximo permitido de 50 MB.",
        )

    try:
        evidence = inspect_zip_bytes(raw_bytes)
    except zipfile.BadZipFile:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El archivo subido no es un paquete .zip válido.",
        )

    evaluation = build_rea_evaluation(
        source_name=file.filename or "proyecto.zip",
        evidence=evidence,
        traffic_tier=traffic_tier,
        target_region=target_region,
        custom_notes=custom_notes,
    )

    if trial_user is not None:
        evaluation["subscription_quota"] = consume_gatekeeper_attempt(db, trial_user)

    return evaluation


# ==========================================================
# 3. AUDITORÍA DE GITHUB (`POST /api/v1/migration-evaluator/evaluate-github`)
# ==========================================================
@router.post(
    "/evaluate-github",
    response_model=EnterpriseEvaluationResponse,
    summary="Inspecciona un repositorio de GitHub y genera la evaluación arquitectónica REA (con Gatekeeper Freemium)",
)
async def evaluate_github_project(
    payload: GithubEvalRequest,
    x_user_email: Optional[str] = Header(None, alias="X-User-Email"),
    authorization: Optional[str] = Header(None, alias="Authorization"),
    db: Session = Depends(get_db),
):
    """
    Analiza un repositorio de GitHub aplicando previamente el Gatekeeper Freemium
    si el usuario envía su correo o token (`2 intentos gratuitos` en plan `'free'`).
    """
    resolved_email = resolve_user_email(payload.email, x_user_email, authorization)
    trial_user = None

    if resolved_email:
        trial_user = validate_gatekeeper_precheck(db, resolved_email)

    repo_name = payload.repo_url.rstrip("/").split("/")[-1] or "github-repo"
    try:
        evidence = await inspect_github_repository(
            repo_url=payload.repo_url,
            github_token=payload.github_token,
        )
    except ProjectInspectionError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc)) from exc
    evaluation = build_rea_evaluation(
        source_name=f"GitHub: {repo_name}",
        evidence=evidence,
        traffic_tier=payload.traffic_tier,
        target_region=payload.target_region,
        custom_notes=payload.custom_notes,
    )

    if trial_user is not None:
        evaluation["subscription_quota"] = consume_gatekeeper_attempt(db, trial_user)

    return evaluation


@router.post(
    "/evaluate-document",
    response_model=EnterpriseEvaluationResponse,
    summary="Audita documentación técnica con el Motor REA y el Gatekeeper Freemium",
)
async def evaluate_document_project(
    payload: DocumentEvalRequest,
    x_user_email: Optional[str] = Header(None, alias="X-User-Email"),
    authorization: Optional[str] = Header(None, alias="Authorization"),
    db: Session = Depends(get_db),
):
    """Procesa documentos desde el backend para evitar análisis simulados en React."""
    resolved_email = resolve_user_email(payload.email, x_user_email, authorization)
    trial_user = validate_gatekeeper_precheck(db, resolved_email) if resolved_email else None
    evidence = inspect_document_text(payload.content)
    evaluation = build_rea_evaluation(
        source_name=payload.name,
        evidence=evidence,
        traffic_tier=payload.traffic_tier,
        target_region=payload.target_region,
        custom_notes=payload.custom_notes,
    )
    if trial_user is not None:
        evaluation["subscription_quota"] = consume_gatekeeper_attempt(db, trial_user)
    return evaluation
