"""Recomendaciones del copiloto AWS basadas en el estado real del dashboard."""

from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.proposal import CloudProposal
from app.services.iam_security_scorer import evaluate_iam_security_controls
from app.services.pricing_calculator import (
    build_finops_simulation_rows,
)
from app.api.v1.endpoints.regions import AWS_REGIONS_CATALOG


router = APIRouter(prefix="/advisor", tags=["Copiloto AWS"])


class AdvisorRequest(BaseModel):
    query: str = Field(..., min_length=1)
    proposal_id: Optional[str] = None
    selected_region: str = "sa-east-1"
    selected_services: List[str] = Field(default_factory=list)
    security_controls: Dict[str, bool] = Field(default_factory=dict)


class AdvisorResponse(BaseModel):
    text: str
    timestamp: str
    details_card: Optional[Dict[str, Any]] = None
    action: Optional[Dict[str, Any]] = None


def _region_name(code: str) -> str:
    return next((item["name"] for item in AWS_REGIONS_CATALOG if item["code"] == code), code)


def _pricing(services: List[str]) -> Dict[str, Any]:
    items = build_finops_simulation_rows(services, "medium")
    monthly = round(sum(float(item["monthly_cost"]) for item in items), 2)
    return {
        "monthly_total_usd": monthly,
        "annual_total_usd": round(monthly * 12, 2),
        "currency": "USD",
    }


@router.post("/query", response_model=AdvisorResponse)
async def query_advisor(payload: AdvisorRequest, db: Session = Depends(get_db)) -> AdvisorResponse:
    """Responde usando catálogo, costos, regiones y controles persistidos en backend."""
    proposal = db.query(CloudProposal).filter(CloudProposal.id == payload.proposal_id).first() if payload.proposal_id else None
    services = list(proposal.selected_services if proposal else payload.selected_services)
    region = proposal.region if proposal else payload.selected_region
    query = payload.query.strip()
    normalized = query.lower()
    timestamp = __import__("datetime").datetime.now().strftime("%H:%M")

    if any(word in normalized for word in ("seguridad", "auditar", "brecha", "mfa", "iam", "100/100")):
        evaluated = evaluate_iam_security_controls(payload.security_controls, services)
        missing = 100 - evaluated["security_score"]
        return AdvisorResponse(
            text=(
                f"La postura actual calculada por el backend es "
                f"**{evaluated['security_score']}/100** ({evaluated['posture_label']}). "
                f"{missing} puntos requieren atención."
            ),
            timestamp=timestamp,
            details_card={
                "title": "Postura IAM de la propuesta",
                "badge": f"{evaluated['security_score']}/100",
                "items": [
                    {"label": "Servicios evaluados", "value": str(len(services))},
                    {"label": "Roles recomendados", "value": str(len(evaluated["recommended_iam_roles"]))},
                ],
                "pros": evaluated["recommended_iam_roles"],
            },
            action={
                "type": "apply_security",
                "label": "Aplicar controles evaluados",
                "payload": {
                    "rootBlocked": True,
                    "mfaEnforced": True,
                    "ec2Roles": "EC2" in services or "ECS" in services,
                    "tls13": True,
                    "s3EncryptionAndVersioning": "S3" in services,
                    "complianceAudits": True,
                },
            },
        )

    if any(word in normalized for word in ("latam", "perú", "peru", "sudamérica", "sudamerica", "brasil")):
        target = "sa-east-1"
    elif any(word in normalized for word in ("europa", "gdpr", "irlanda", "ue")):
        target = "eu-west-1"
    elif any(word in normalized for word in ("económica", "economica", "barata", "barato", "costo", "presupuesto")):
        target = "us-east-1"
    else:
        target = region.split()[0]

    if any(word in normalized for word in ("región", "region", "latam", "perú", "peru", "europa", "gdpr", "costo", "barata")):
        return AdvisorResponse(
            text=f"La recomendación se calculó con el catálogo de regiones del backend: **{target}** ({_region_name(target)}).",
            timestamp=timestamp,
            details_card={
                "title": f"Región {target}",
                "badge": "Catálogo AWS",
                "items": [{"label": "Región actual", "value": region}, {"label": "Región recomendada", "value": target}],
            },
            action={"type": "apply_region", "label": f"Aplicar {target}", "payload": target},
        )

    if any(word in normalized for word in ("arquitectura", "e-commerce", "retail", "tienda", "serverless", "data lake", "microservicios", "erp")):
        if any(word in normalized for word in ("serverless", "data lake", "lambda")):
            recommended = ["S3", "Lambda", "CloudWatch", "IAM"]
            app_type = "Data Lake & Analítica"
        elif any(word in normalized for word in ("microservicios", "contenedor")):
            recommended = ["ECS", "RDS", "ALB", "VPC", "CloudWatch", "IAM"]
            app_type = "Microservicios Cloud"
        else:
            recommended = ["EC2", "RDS", "S3", "CloudFront", "VPC", "Route 53", "IAM"]
            app_type = "E-commerce & Retail"
        pricing = _pricing(recommended)
        return AdvisorResponse(
            text=f"El backend preparó una recomendación con **{len(recommended)} servicios del catálogo AWS** y la dejó lista para registrar como propuesta.",
            timestamp=timestamp,
            details_card={
                "title": "Arquitectura recomendada",
                "badge": "FinOps calculado",
                "items": [
                    {"label": "Servicios", "value": ", ".join(recommended)},
                    {"label": "Costo mensual", "value": f"${pricing['monthly_total_usd']:.2f} USD"},
                    {"label": "Región", "value": region},
                ],
            },
            action={
                "type": "apply_architecture",
                "label": "Registrar propuesta en el sistema",
                "payload": {
                    "solutionName": f"Arquitectura recomendada para {app_type}",
                    "appType": app_type,
                    "description": f"Recomendación generada por el backend para: {query}",
                    "region": region,
                    "estimatedUsers": proposal.estimated_users if proposal else 1000,
                    "availabilityLevel": "99.95% (Alta Disponibilidad)",
                    "selectedServices": recommended,
                    "migrationGoal": "Modernización de Aplicación",
                    "monthlyBudget": pricing["monthly_total_usd"],
                    "annualBudget": pricing["annual_total_usd"],
                    "status": "En Revisión",
                },
            },
        )

    monthly = _pricing(services)["monthly_total_usd"] if services else 0
    score = evaluate_iam_security_controls(payload.security_controls, services)["security_score"]
    return AdvisorResponse(
        text=(
            f"Estado actual desde backend: **{len(services)} servicios**, "
            f"**${monthly:.2f}/mes**, región **{region}** y seguridad **{score}/100**. "
            "Puedes pedir una arquitectura, una región o una auditoría IAM."
        ),
        timestamp=timestamp,
    )
