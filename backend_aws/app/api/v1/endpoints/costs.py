"""
===============================================================================
PROYECTO: Cloud Diagnostix — AWS Cloud Suite Backend
MÓDULO: app/api/v1/endpoints/costs.py
CAPA ARQUITECTÓNICA: API v1 (Calculadora FinOps AWS y Simulación de Costos)
DESCRIPCIÓN:
    Expone el catálogo oficial de los 19 servicios AWS y el desglose FinOps
    sobre 730 horas/mes para cada propuesta de arquitectura.
INTEGRACIÓN FRONTEND / BD:
    - Frontend: Simulador FinOps en AwsPlanning.tsx
    - Base de Datos: Tabla `cost_simulation_items`
    - Referencia Contexto: context_backend/03_MOTOR_REA_E_INTELIGENCIA_ARTIFICIAL.md
===============================================================================
"""

from typing import Any, Dict, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.cost_item import CostSimulationItem
from app.models.proposal import CloudProposal
from app.schemas.cost_schema import CostCalculationRequest, CostSimulationItemSchema
from app.services.pricing_calculator import AWS_REA_CATALOG, build_finops_simulation_rows

router = APIRouter(tags=["FinOps & Simulación de Costos AWS"])


# ==========================================================
# 1. CATÁLOGO OFICIAL DE PRECIOS AWS (19 SERVICIOS)
# ==========================================================
@router.get(
    "/costs/catalog",
    summary="Devuelve el catálogo oficial de los 19 servicios AWS y sus precios base",
)
async def get_aws_pricing_catalog() -> Dict[str, Any]:
    """Entrega la matriz oficial `AWS_REA_CATALOG` utilizada por el Motor REA."""
    return {
        "hours_per_month": 730,
        "currency": "USD",
        "total_services": len(AWS_REA_CATALOG),
        "catalog": AWS_REA_CATALOG,
    }


# ==========================================================
# 2. DESGLOSE Y RECÁLCULO FINOPS POR PROPUESTA
# ==========================================================
@router.get(
    "/proposals/{proposal_id}/costs",
    response_model=List[CostSimulationItemSchema],
    summary="Lista los ítems de simulación FinOps de una propuesta",
)
async def get_proposal_cost_items(
    proposal_id: str,
    db: Session = Depends(get_db),
) -> List[CostSimulationItemSchema]:
    """Retorna todas las líneas de costo asociadas a la propuesta en `cost_simulation_items`."""
    proposal = db.query(CloudProposal).filter(CloudProposal.id == proposal_id).first()
    if not proposal:
        raise HTTPException(status_code=404, detail=f"Propuesta '{proposal_id}' no encontrada.")

    return [
        CostSimulationItemSchema(
            id=item.id,
            service_id=item.service_id,
            service_name=item.service_name,
            service_code=item.service_code,
            category=item.category,
            instance_type_or_tier=item.instance_type_or_tier,
            quantity=item.quantity,
            hours_per_month=item.hours_per_month,
            unit=item.unit or "hour",
            unit_price=item.unit_price,
            cost_per_hour=item.cost_per_hour,
            monthly_cost=item.monthly_cost,
            annual_cost=item.annual_cost,
        )
        for item in proposal.cost_items
    ]


@router.post(
    "/proposals/{proposal_id}/costs/recalculate",
    summary="Recalcula los costos FinOps de una propuesta y actualiza su presupuesto mensual/anual",
)
async def recalculate_proposal_costs(
    proposal_id: str,
    payload: CostCalculationRequest,
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    """Reconstruye los ítems de costo en función de los servicios y el nivel de tráfico."""
    proposal = db.query(CloudProposal).filter(CloudProposal.id == proposal_id).first()
    if not proposal:
        raise HTTPException(status_code=404, detail=f"Propuesta '{proposal_id}' no encontrada.")

    db.query(CostSimulationItem).filter(CostSimulationItem.proposal_id == proposal.id).delete()
    rows = build_finops_simulation_rows(payload.selected_services, payload.traffic_tier)
    for row in rows:
        db.add(CostSimulationItem(proposal_id=proposal.id, **row))

    monthly_total = round(sum(r["monthly_cost"] for r in rows), 2)
    annual_total = round(monthly_total * 12, 2)
    proposal.selected_services = payload.selected_services
    proposal.monthly_budget = monthly_total
    proposal.annual_budget = annual_total

    db.commit()
    return {
        "proposal_id": proposal.id,
        "monthly_total_usd": monthly_total,
        "annual_total_usd": annual_total,
        "currency": "USD",
        "items": rows,
    }

