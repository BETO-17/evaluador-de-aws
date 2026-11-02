"""
===============================================================================
PROYECTO: Cloud Diagnostix — AWS Cloud Suite Backend
MÓDULO: app/schemas/rea_schema.py
CAPA ARQUITECTÓNICA: Schemas (Contratos Pydantic v2 del Motor Evaluador REA)
DESCRIPCIÓN:
    Define los esquemas exactos 1:1 que consume `analyzerService.ts` en el
    frontend: estado del motor (`EvaluatorStatusResponse`), solicitud de
    auditoría GitHub (`GithubEvalRequest`) y respuesta de evaluación empresarial
    (`EnterpriseEvaluationResponse`) con los 3 escenarios FinOps y metadata de
    cuota Freemium (`subscription_quota`).
INTEGRACIÓN FRONTEND / BD:
    - Frontend: src/features/modules/aws-cloud/services/analyzerService.ts
    - Base de Datos: Tabla `proposal_rea_evaluations`
    - Referencia Contexto: context_backend/02_CONTRATOS_API_REST_ENDPOINTS.md y plan_suscripcion.txt
===============================================================================
"""

from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


# ==========================================================
# 1. ESQUEMAS DE SALUD Y SOLICITUD DE EVALUACIÓN REA
# ==========================================================
class EvaluatorStatusResponse(BaseModel):
    """
    Contrato exacto esperado por `analyzerService.ts` al consultar
    `GET /api/v1/migration-evaluator/status`.
    """

    status: str = "online"
    service: str = "Cloud Diagnostix REA Evaluator"
    ai_engine: str = "Claude + REA Engine (Gemini fallback)"
    gemini_active: bool = False
    ai_provider: str = "REA Heuristic Engine"


class GithubEvalRequest(BaseModel):
    """
    Payload de entrada para `POST /api/v1/migration-evaluator/evaluate-github`.
    Permite enviar opcionalmente `email` para vincular la evaluación al control
    de 2 intentos gratuitos (`plan_suscripcion.txt`).
    """

    repo_url: str = Field(..., examples=["https://github.com/tiangolo/fastapi"])
    github_token: Optional[str] = None
    traffic_tier: str = Field("medium", description="low | medium | high | enterprise")
    target_region: str = Field("sa-east-1", description="Región AWS objetivo")
    custom_notes: Optional[str] = None
    email: Optional[str] = Field(None, description="Correo del usuario para control de cuota Freemium")


class DocumentEvalRequest(BaseModel):
    """Payload para auditar texto o documentación enviada desde el frontend."""

    name: str = Field("documento.txt")
    content: str = Field(..., min_length=1)
    traffic_tier: str = Field("medium")
    target_region: str = Field("sa-east-1")
    custom_notes: Optional[str] = None
    email: Optional[str] = None


# ==========================================================
# 2. ESQUEMAS DE RESPUESTA DE AUDITORÍA (`EnterpriseEvaluationResponse`)
# ==========================================================
class TechnicalEvidenceSchema(BaseModel):
    """Evidencia estática detectada en el paquete .zip o repositorio GitHub."""

    languages: List[str]
    frameworks: List[str]
    databases: List[str]
    has_docker: bool
    total_files: int
    project_description: Optional[str] = None


class ReaServiceItemSchema(BaseModel):
    """Servicio AWS dimensionado dentro de un escenario REA."""

    service_name: str
    service_code: str
    category: str
    role: str
    specs: str
    quantity: int
    estimated_unit_cost_usd: float
    total_monthly_usd: float
    reason: str


class ReaScenarioPricingSchema(BaseModel):
    """Totales mensuales y anuales en USD para un escenario REA."""

    monthly_total_usd: float
    annual_total_usd: float
    currency: str = "USD"


class ReaScenarioSchema(BaseModel):
    """
    Representa uno de los 3 escenarios obligatorios:
    - `Cost-Optimized`
    - `Recommended-Production`
    - `High-Availability-Enterprise`
    """

    scenario_type: str
    summary: str
    services: List[ReaServiceItemSchema]
    pricing: ReaScenarioPricingSchema


class EnterpriseEvaluationResponse(BaseModel):
    """
    Contrato principal devuelto por `/evaluate-zip` y `/evaluate-github`.
    Incluye `subscription_quota` cuando el usuario envía su correo o token.
    """

    status: str = "success"
    origin_detected: str
    detected_configs: List[str]
    system_description: str = ""
    system_analysis: str
    architecture_pattern: str
    migration_strategy: str
    well_architected_notes: List[str]
    technical_evidence: TechnicalEvidenceSchema
    scenarios: List[ReaScenarioSchema]
    subscription_quota: Optional[Dict[str, Any]] = None
    ai_generated: bool = False
    ai_provider: str = "REA Heuristic Engine"
    ai_fallback_reason: Optional[str] = None
