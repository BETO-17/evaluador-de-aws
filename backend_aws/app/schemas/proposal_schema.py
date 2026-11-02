"""
===============================================================================
PROYECTO: Cloud Diagnostix — AWS Cloud Suite Backend
MÓDULO: app/schemas/proposal_schema.py
CAPA ARQUITECTÓNICA: Schemas (Contratos Pydantic v2 para Propuestas Cloud)
DESCRIPCIÓN:
    Define los esquemas de creación, actualización, migración de región AWS y
    edición de diagramas Draw.io para las propuestas cloud de Cloud Diagnostix.
INTEGRACIÓN FRONTEND / BD:
    - Frontend: AwsPlanning.tsx, AwsDrawioEditor.tsx y Globo 3D
    - Base de Datos: Tablas `cloud_proposals`, `architecture_diagrams`, `region_migrations_log`
    - Referencia Contexto: context_backend/02_CONTRATOS_API_REST_ENDPOINTS.md
===============================================================================
"""

from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field

from app.schemas.security_schema import SecurityControlsPayload


# ==========================================================
# 1. ESQUEMAS DE CREACIÓN Y ACTUALIZACIÓN DE PROPUESTAS
# ==========================================================
class ProposalCreateRequest(BaseModel):
    """
    Payload para registrar una nueva propuesta de arquitectura AWS en `/api/v1/proposals`.
    Soporta nombres en snake_case y camelCase enviados por el frontend.
    """

    solution_name: str = Field("Nueva propuesta AWS", alias="solutionName")
    app_type: str = Field("", alias="appType")
    description: str = Field("Propuesta pendiente de evaluación del proyecto.")
    region: str = Field("sa-east-1")
    estimated_users: int = Field(5000, alias="estimatedUsers", gt=0)
    availability_level: str = Field("99.95% (Alta Disponibilidad)", alias="availabilityLevel")
    selected_services: List[str] = Field(default_factory=list, alias="selectedServices")
    migration_goal: str = Field("Modernización de Aplicación", alias="migrationGoal")
    monthly_budget: Optional[float] = Field(None, alias="monthlyBudget")
    annual_budget: Optional[float] = Field(None, alias="annualBudget")
    status: str = Field("Aprobada")
    applied_scenario: str = Field("Recommended-Production", alias="appliedScenario")
    is_active: bool = Field(True, alias="isActive")
    traffic_tier: str = Field("medium", alias="trafficTier")
    rea_evaluation: Optional[Dict[str, Any]] = Field(None, alias="reaEvaluation")
    security_controls: Optional[SecurityControlsPayload] = Field(None, alias="securityControls")

    model_config = ConfigDict(populate_by_name=True, extra="ignore")


class ProposalUpdateRequest(BaseModel):
    """Payload parcial para actualizar una propuesta existente (`PUT /api/v1/proposals/{id}`)."""

    solution_name: Optional[str] = Field(None, alias="solutionName")
    app_type: Optional[str] = Field(None, alias="appType")
    description: Optional[str] = None
    region: Optional[str] = None
    estimated_users: Optional[int] = Field(None, alias="estimatedUsers")
    availability_level: Optional[str] = Field(None, alias="availabilityLevel")
    selected_services: Optional[List[str]] = Field(None, alias="selectedServices")
    migration_goal: Optional[str] = Field(None, alias="migrationGoal")
    monthly_budget: Optional[float] = Field(None, alias="monthlyBudget")
    annual_budget: Optional[float] = Field(None, alias="annualBudget")
    status: Optional[str] = None
    applied_scenario: Optional[str] = Field(None, alias="appliedScenario")
    is_active: Optional[bool] = Field(None, alias="isActive")
    rea_evaluation: Optional[Dict[str, Any]] = Field(None, alias="reaEvaluation")
    security_controls: Optional[SecurityControlsPayload] = Field(None, alias="securityControls")

    model_config = ConfigDict(populate_by_name=True, extra="ignore")


# ==========================================================
# 2. ESQUEMAS DE MIGRACIÓN DE REGIÓN Y DIAGRAMAS DRAW.IO
# ==========================================================
class RegionMigrateRequest(BaseModel):
    """
    Payload para `POST /api/v1/proposals/{id}/migrate-region`.
    Permite migrar una propuesta de una región AWS a otra (ej. `sa-east-1` -> `us-east-1`).
    """

    to_region: str = Field(..., alias="toRegion", examples=["us-east-1"])
    from_region: Optional[str] = Field(None, alias="fromRegion")
    migrated_services: Optional[List[str]] = Field(None, alias="migratedServices")

    model_config = ConfigDict(populate_by_name=True, extra="ignore")


class DrawioDiagramUpdateRequest(BaseModel):
    """
    Payload para `PUT /api/v1/proposals/{id}/diagrams/drawio`.
    Guarda el XML editado manualmente por el usuario en AwsDrawioEditor.tsx.
    """

    # React Flow puede guardar solo su grafo y conservar el XML existente.
    drawio_xml: Optional[str] = Field(None, alias="drawioXml")
    region_snapshot: Optional[str] = Field(None, alias="regionSnapshot")
    reactflow_graph: Optional[Dict[str, Any]] = Field(None, alias="reactflowGraph")

    model_config = ConfigDict(populate_by_name=True, extra="ignore")

