"""Motor REA: inspección técnica real + plan arquitectónico generado por IA.

La evidencia técnica siempre proviene del ZIP, GitHub o documento recibido por la
API. Gemini es el proveedor principal y Claude el respaldo opcional. La calculadora
FinOps del backend conserva la fuente de verdad de precios y normaliza los servicios
que propone la IA contra el catálogo oficial de AWS.
"""

import json
import logging
from typing import Any, Dict, List, Optional, Tuple

import httpx

from app.core.config import settings
from app.services.pricing_calculator import (
    AWS_REA_CATALOG,
    OFFICIAL_SERVICE_CODES,
    TRAFFIC_TIER_MULTIPLIERS,
    build_scenario_service_items,
    summarize_scenario_pricing,
)

logger = logging.getLogger(__name__)

SCENARIO_FACTORS = {
    "Cost-Optimized": (0.68, 1),
    "Recommended-Production": (1.00, 2),
    "High-Availability-Enterprise": (1.35, 3),
}

REA_AI_PROMPT = """
Eres REA (Reasoning & Enterprise Architecture Agent), el evaluador técnico de
Cloud Diagnostix AWS. Analiza únicamente la evidencia real recibida del proyecto.
No inventes lenguajes, frameworks, bases de datos, archivos ni proveedores que no
aparezcan en la evidencia. Diseña la migración para la región {target_region} y
tráfico {traffic_tier}.

Devuelve SOLO JSON válido con esta estructura:
{{
  "system_analysis": "explicación técnica concreta del proyecto detectado",
  "architecture_pattern": "patrón recomendado",
  "migration_strategy": "Rehost | Replatform | Refactor | Repurchase | Retain",
  "well_architected_notes": ["una recomendación por pilar relevante"],
  "scenarios": [
    {{
      "scenario_type": "Cost-Optimized",
      "summary": "...",
      "service_codes": ["VPC", "EC2", "S3"],
      "service_reasons": {{"EC2": "razón específica basada en la evidencia"}},
      "service_specs": {{"EC2": "dimensionamiento y configuración recomendada"}}
    }},
    {{"scenario_type": "Recommended-Production", "summary": "...", "service_codes": [], "service_reasons": {{}}, "service_specs": {{}}}},
    {{"scenario_type": "High-Availability-Enterprise", "summary": "...", "service_codes": [], "service_reasons": {{}}, "service_specs": {{}}}}
  ]
}}

Usa únicamente estos códigos exactos del catálogo: {catalog}.
La cantidad y el precio serán calculados por el backend; no devuelvas precios.
"""


def build_rea_evaluation(
    source_name: str,
    evidence: Dict[str, Any],
    traffic_tier: str = "medium",
    target_region: str = "sa-east-1",
    custom_notes: Optional[str] = None,
) -> Dict[str, Any]:
    """Construye una ficha REA basada en la evidencia del proyecto.

    La IA decide patrón, estrategia, recomendaciones y justificaciones. El motor
    local valida los códigos y calcula los importes para evitar datos inventados o
    precios producidos por el modelo.
    """
    evidence = _normalize_evidence(evidence)
    fallback = _build_heuristic_evaluation(source_name, evidence, traffic_tier, target_region, custom_notes)

    ai_plan, provider = _try_ai_plan(source_name, evidence, traffic_tier, target_region, custom_notes)
    if ai_plan:
        result = _apply_ai_plan(fallback, ai_plan, evidence, traffic_tier)
        result["ai_generated"] = True
        result["ai_provider"] = provider
        return result

    fallback["ai_generated"] = False
    fallback["ai_provider"] = "REA Heuristic Engine (IA no disponible)"
    return fallback


def _normalize_evidence(evidence: Dict[str, Any]) -> Dict[str, Any]:
    """Conserva únicamente evidencia serializable y evita valores simulados."""
    return {
        "languages": [str(item) for item in evidence.get("languages", []) if str(item).strip()],
        "frameworks": [str(item) for item in evidence.get("frameworks", []) if str(item).strip()],
        "databases": [str(item) for item in evidence.get("databases", []) if str(item).strip()],
        "has_docker": bool(evidence.get("has_docker", False)),
        "total_files": max(int(evidence.get("total_files", 0) or 0), 0),
        "detected_configs": [str(item) for item in evidence.get("detected_configs", []) if str(item).strip()],
    }


def _heuristic_service_codes(evidence: Dict[str, Any]) -> Tuple[List[str], List[str], List[str]]:
    has_docker = bool(evidence.get("has_docker"))
    dbs = " ".join(evidence.get("databases", [])).lower()
    recommended = ["Route 53", "CloudFront", "ALB", "VPC", "ECS" if has_docker else "EC2"]
    recommended.append("DynamoDB" if "nosql" in dbs or "dynamo" in dbs else "RDS")
    if "redis" in dbs:
        recommended.append("ElastiCache")
    recommended.extend(["S3", "IAM", "CloudWatch"])
    recommended = list(dict.fromkeys(recommended))
    cost = ["Route 53", "VPC", "EC2", "RDS", "S3", "IAM"]
    enterprise = list(dict.fromkeys(recommended + ["WAF", "Aurora", "ElastiCache", "KMS", "SecretsManager"]))
    return cost, recommended, enterprise


def _build_heuristic_evaluation(
    source_name: str,
    evidence: Dict[str, Any],
    traffic_tier: str,
    target_region: str,
    custom_notes: Optional[str],
) -> Dict[str, Any]:
    cost_codes, recommended_codes, enterprise_codes = _heuristic_service_codes(evidence)
    scenarios = []
    for scenario_type, codes in zip(
        SCENARIO_FACTORS,
        (cost_codes, recommended_codes, enterprise_codes),
    ):
        factor, quantity = SCENARIO_FACTORS[scenario_type]
        items = build_scenario_service_items(
            codes,
            factor * TRAFFIC_TIER_MULTIPLIERS.get(traffic_tier, 1.0),
            compute_qty=quantity,
        )
        scenarios.append(
            {
                "scenario_type": scenario_type,
                "summary": f"Escenario {scenario_type} calculado por REA a partir de la evidencia técnica recibida.",
                "services": items,
                "pricing": summarize_scenario_pricing(items),
            }
        )

    languages = ", ".join(evidence["languages"] or ["No detectado"])
    frameworks = ", ".join(evidence["frameworks"] or ["No detectado"])
    databases = ", ".join(evidence["databases"] or ["No detectado"])
    analysis = (
        f"REA analizó {evidence['total_files']} archivos de '{source_name}' para {target_region}. "
        f"Evidencia detectada: lenguajes {languages}; frameworks {frameworks}; bases de datos {databases}."
    )
    if custom_notes:
        analysis += f" Requerimientos adicionales: {custom_notes.strip()}."

    return {
        "status": "success",
        "origin_detected": f"Proyecto auditado ({source_name})",
        "detected_configs": evidence["detected_configs"],
        "system_analysis": analysis,
        "architecture_pattern": "Microservicios contenedorizados Multi-AZ" if evidence["has_docker"] else "Arquitectura web empresarial multi-capa",
        "migration_strategy": "Replatform",
        "well_architected_notes": [
            f"Fiabilidad: diseñar redundancia Multi-AZ en {target_region}.",
            "Seguridad: usar IAM de mínimo privilegio, TLS y secretos administrados.",
            "Costos: comparar el escenario elegido contra el tráfico configurado.",
            "Operación: centralizar logs, métricas y alertas en CloudWatch.",
        ],
        "technical_evidence": evidence,
        "scenarios": scenarios,
    }


def _apply_ai_plan(
    fallback: Dict[str, Any],
    plan: Dict[str, Any],
    evidence: Dict[str, Any],
    traffic_tier: str,
) -> Dict[str, Any]:
    """Combina el razonamiento de IA con precios y catálogo validados localmente."""
    result = dict(fallback)
    for key in ("system_analysis", "architecture_pattern", "migration_strategy", "well_architected_notes"):
        value = plan.get(key)
        if isinstance(value, str) and value.strip():
            result[key] = value.strip()
        elif key == "well_architected_notes" and isinstance(value, list) and value:
            result[key] = [str(item) for item in value if str(item).strip()]

    ai_scenarios = plan.get("scenarios")
    if not isinstance(ai_scenarios, list):
        return result

    fallback_by_type = {item["scenario_type"]: item for item in fallback["scenarios"]}
    normalized_scenarios = []
    for scenario_type, (factor, quantity) in SCENARIO_FACTORS.items():
        candidate = next((item for item in ai_scenarios if isinstance(item, dict) and item.get("scenario_type") == scenario_type), {})
        default = fallback_by_type[scenario_type]
        codes = _normalize_service_codes(candidate.get("service_codes"))
        if not codes:
            codes = [item["service_code"] for item in default["services"]]
        items = build_scenario_service_items(
            codes,
            factor * TRAFFIC_TIER_MULTIPLIERS.get(traffic_tier, 1.0),
            compute_qty=quantity,
        )
        reasons = candidate.get("service_reasons") if isinstance(candidate.get("service_reasons"), dict) else {}
        specs = candidate.get("service_specs") if isinstance(candidate.get("service_specs"), dict) else {}
        for item in items:
            code = item["service_code"]
            if isinstance(reasons.get(code), str) and reasons[code].strip():
                item["reason"] = reasons[code].strip()[:1000]
            if isinstance(specs.get(code), str) and specs[code].strip():
                item["specs"] = specs[code].strip()[:500]
        normalized_scenarios.append(
            {
                "scenario_type": scenario_type,
                "summary": str(candidate.get("summary") or default["summary"]),
                "services": items,
                "pricing": summarize_scenario_pricing(items),
            }
        )
    result["scenarios"] = normalized_scenarios
    result["technical_evidence"] = evidence
    return result


def _normalize_service_codes(raw_codes: Any) -> List[str]:
    if not isinstance(raw_codes, list):
        return []
    by_lower = {code.lower(): code for code in OFFICIAL_SERVICE_CODES}
    normalized = []
    for raw in raw_codes:
        if not isinstance(raw, str):
            continue
        code = by_lower.get(raw.strip().lower())
        if code and code not in normalized:
            normalized.append(code)
    return normalized


def _try_ai_plan(
    source_name: str,
    evidence: Dict[str, Any],
    traffic_tier: str,
    target_region: str,
    custom_notes: Optional[str],
) -> Tuple[Optional[Dict[str, Any]], str]:
    prompt = REA_AI_PROMPT.format(
        target_region=target_region,
        traffic_tier=traffic_tier,
        catalog=json.dumps(OFFICIAL_SERVICE_CODES, ensure_ascii=False),
    )
    context = json.dumps(
        {
            "source_name": source_name,
            "evidence": evidence,
            "custom_notes": custom_notes,
        },
        ensure_ascii=False,
    )
    # Claude se usa primero cuando está configurado: es el proveedor solicitado
    # para el análisis actual y evita que una llamada Gemini bloqueada impida
    # generar la ficha técnica. Gemini queda como respaldo automático.
    if settings.CLAUDE_API_KEY:
        plan = _call_claude(prompt, context)
        if plan:
            return plan, "Claude"
    if settings.GEMINI_API_KEY:
        plan = _call_gemini(prompt, context)
        if plan:
            return plan, "Gemini"
    return None, ""


def _call_gemini(prompt: str, context: str) -> Optional[Dict[str, Any]]:
    try:
        from google import genai
        from google.genai import types

        client = genai.Client(api_key=settings.GEMINI_API_KEY)
        response = client.models.generate_content(
            model=settings.GEMINI_MODEL,
            contents=f"{prompt}\n\nEVIDENCIA REAL DEL PROYECTO:\n{context}",
            config=types.GenerateContentConfig(response_mime_type="application/json", temperature=0.2),
        )
        if response and response.text:
            return _parse_ai_json(response.text)
    except Exception as exc:
        logger.warning("Gemini no pudo generar el plan REA: %s", exc)
    return None


def _call_claude(prompt: str, context: str) -> Optional[Dict[str, Any]]:
    try:
        with httpx.Client(timeout=45) as client:
            response = client.post(
                "https://api.anthropic.com/v1/messages",
                headers={
                    "x-api-key": settings.CLAUDE_API_KEY,
                    "anthropic-version": "2023-06-01",
                    "content-type": "application/json",
                },
                json={
                    "model": settings.CLAUDE_MODEL,
                    "max_tokens": 5000,
                    "system": prompt,
                    "messages": [{"role": "user", "content": f"EVIDENCIA REAL DEL PROYECTO:\n{context}"}],
                },
            )
            payload = response.json()
            if not response.is_success:
                message = payload.get("error", {}).get("message", "respuesta no válida")
                logger.warning("Claude respondió HTTP %s: %s", response.status_code, message)
                return None
            blocks = payload.get("content", [])
            text = "".join(block.get("text", "") for block in blocks if block.get("type") == "text")
            if not text.strip():
                logger.warning("Claude devolvió una respuesta sin contenido de texto.")
                return None
            return _parse_ai_json(text)
    except Exception as exc:
        logger.warning("Claude no pudo generar el plan REA: %s", exc)
    return None


def _parse_ai_json(raw_text: str) -> Optional[Dict[str, Any]]:
    """Acepta JSON puro y JSON envuelto en bloques Markdown de la IA."""
    text = raw_text.strip()
    if text.startswith("```"):
        lines = text.splitlines()
        text = "\n".join(line for line in lines if not line.strip().startswith("```")).strip()
        if text.lower().startswith("json\n"):
            text = text[5:].strip()
    try:
        parsed = json.loads(text)
        return parsed if isinstance(parsed, dict) else None
    except json.JSONDecodeError:
        start = text.find("{")
        end = text.rfind("}")
        if start < 0 or end <= start:
            logger.warning("La IA no devolvió un objeto JSON interpretable.")
            return None
        try:
            parsed = json.loads(text[start : end + 1])
            return parsed if isinstance(parsed, dict) else None
        except json.JSONDecodeError:
            logger.warning("La IA devolvió JSON inválido para el plan REA.")
            return None
