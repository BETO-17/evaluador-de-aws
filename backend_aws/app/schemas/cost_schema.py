"""
===============================================================================
PROYECTO: Cloud Diagnostix — AWS Cloud Suite Backend
MÓDULO: app/schemas/cost_schema.py
CAPA ARQUITECTÓNICA: Schemas (Contratos Pydantic v2 para FinOps AWS)
DESCRIPCIÓN:
    Define los esquemas para simulación y desglose de costos FinOps sobre el
    catálogo oficial de 19 servicios de Amazon Web Services (730 horas/mes).
INTEGRACIÓN FRONTEND / BD:
    - Frontend: Simulador FinOps en AwsPlanning.tsx
    - Base de Datos: Tabla `cost_simulation_items`
    - Referencia Contexto: context_backend/03_MOTOR_REA_E_INTELIGENCIA_ARTIFICIAL.md
===============================================================================
"""

from typing import List, Optional
from pydantic import BaseModel, Field


# ==========================================================
# 1. ESQUEMAS DE ÍTEMS Y SIMULACIÓN FINOPS
# ==========================================================
class CostSimulationItemSchema(BaseModel):
    """Detalle de costo FinOps para un servicio AWS individual."""

    id: Optional[str] = None
    service_id: str
    service_name: str
    service_code: str
    category: str
    instance_type_or_tier: str
    quantity: int = Field(1, ge=1)
    hours_per_month: int = 730
    unit: str = "hour"
    unit_price: float
    cost_per_hour: float
    monthly_cost: float
    annual_cost: float


class CostCalculationRequest(BaseModel):
    """Solicitud para recalcular costos de una lista de servicios AWS."""

    selected_services: List[str]
    traffic_tier: str = "medium"
    region: str = "sa-east-1"
    scenario_type: str = "Recommended-Production"

