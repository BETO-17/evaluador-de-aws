"""
===============================================================================
PROYECTO: Cloud Diagnostix — AWS Cloud Suite Backend
MÓDULO: app/services/drawio_aws4_builder.py
CAPA ARQUITECTÓNICA: Services (Generador de Diagramas XML Draw.io AWS4 + MCP Bridge)
DESCRIPCIÓN:
    Construye y valida diagramas de arquitectura en formato XML de Draw.io
    (`.drawio` / `<mxfile>`) utilizando los contenedores oficiales
    `shape=mxgraph.aws4.group` (`group_aws_cloud_alt`, `group_region`,
    `group_vpc2`, `group_security_group`) y los iconos oficiales
    `shape=mxgraph.aws4.resourceIcon` distribuidos en las 5 capas del Motor REA.
INTEGRACIÓN FRONTEND / BD:
    - Frontend: src/features/modules/aws-cloud/components/AwsDrawioEditor.tsx
    - Base de Datos: Tabla `architecture_diagrams`
    - MCP Server: `.agents/skills/drawio-aws4-mcp/scripts/drawio_aws4_mcp_server.py`
    - Referencia Contexto: context_backend/04_SEGURIDAD_IAM_TOTP_Y_DIAGRAMAS_AWS4.md
===============================================================================
"""

import html
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional


# ==========================================================
# 1. MAPA OFICIAL DE STENCILS MXGRAPH.AWS4 POR CAPA (TIERS 1 A 5)
# ==========================================================
AWS4_STENCIL_CATALOG: Dict[str, Dict[str, Any]] = {
    "Route 53": {
        "label": "Amazon Route 53\n(DNS Global + HealthCheck)",
        "tier": 1,
        "tier_name": "1. Perímetro Global Edge",
        "res_icon": "mxgraph.aws4.route_53",
        "fill_color": "#8C4FFF",
    },
    "CloudFront": {
        "label": "Amazon CloudFront\n(CDN Edge TLS 1.3)",
        "tier": 1,
        "tier_name": "1. Perímetro Global Edge",
        "res_icon": "mxgraph.aws4.cloudfront",
        "fill_color": "#8C4FFF",
    },
    "WAF": {
        "label": "AWS WAF\n(Firewall OWASP Top 10)",
        "tier": 1,
        "tier_name": "1. Perímetro Global Edge",
        "res_icon": "mxgraph.aws4.waf",
        "fill_color": "#DD344C",
    },
    "ALB": {
        "label": "Elastic Load Balancing\n(ALB Multi-AZ Capa 7)",
        "tier": 2,
        "tier_name": "2. Subred Pública (Ingress)",
        "res_icon": "mxgraph.aws4.elastic_load_balancing",
        "fill_color": "#8C4FFF",
    },
    "API Gateway": {
        "label": "Amazon API Gateway\n(Ingress REST/HTTP)",
        "tier": 2,
        "tier_name": "2. Subred Pública (Ingress)",
        "res_icon": "mxgraph.aws4.api_gateway",
        "fill_color": "#8C4FFF",
    },
    "VPC": {
        "label": "Amazon VPC\n(Aislamiento /16)",
        "tier": 2,
        "tier_name": "2. Subred Pública (Ingress)",
        "res_icon": "mxgraph.aws4.vpc",
        "fill_color": "#8C4FFF",
    },
    "EC2": {
        "label": "Amazon EC2\n(Auto Scaling Multi-AZ)",
        "tier": 3,
        "tier_name": "3. Subred Privada App (Cómputo)",
        "res_icon": "mxgraph.aws4.ec2",
        "fill_color": "#ED7100",
    },
    "ECS": {
        "label": "Amazon ECS Fargate\n(Contenedores Serverless)",
        "tier": 3,
        "tier_name": "3. Subred Privada App (Cómputo)",
        "res_icon": "mxgraph.aws4.ecs",
        "fill_color": "#ED7100",
    },
    "EKS": {
        "label": "Amazon EKS\n(Kubernetes Cluster)",
        "tier": 3,
        "tier_name": "3. Subred Privada App (Cómputo)",
        "res_icon": "mxgraph.aws4.eks",
        "fill_color": "#ED7100",
    },
    "Lambda": {
        "label": "AWS Lambda\n(Funciones Serverless)",
        "tier": 3,
        "tier_name": "3. Subred Privada App (Cómputo)",
        "res_icon": "mxgraph.aws4.lambda",
        "fill_color": "#ED7100",
    },
    "SQS": {
        "label": "Amazon SQS\n(Cola Mensajería FIFO)",
        "tier": 3,
        "tier_name": "3. Subred Privada App (Eventos)",
        "res_icon": "mxgraph.aws4.sqs",
        "fill_color": "#E7157B",
    },
    "SNS": {
        "label": "Amazon SNS\n(Eventos Pub/Sub)",
        "tier": 3,
        "tier_name": "3. Subred Privada App (Eventos)",
        "res_icon": "mxgraph.aws4.sns",
        "fill_color": "#E7157B",
    },
    "RDS": {
        "label": "Amazon RDS\n(PostgreSQL Multi-AZ)",
        "tier": 4,
        "tier_name": "4. Subred Privada Datos",
        "res_icon": "mxgraph.aws4.rds",
        "fill_color": "#3B48CC",
    },
    "Aurora": {
        "label": "Amazon Aurora\n(Serverless v2 Multi-AZ)",
        "tier": 4,
        "tier_name": "4. Subred Privada Datos",
        "res_icon": "mxgraph.aws4.aurora",
        "fill_color": "#3B48CC",
    },
    "DynamoDB": {
        "label": "Amazon DynamoDB\n(NoSQL On-Demand PITR)",
        "tier": 4,
        "tier_name": "4. Subred Privada Datos",
        "res_icon": "mxgraph.aws4.dynamodb",
        "fill_color": "#3B48CC",
    },
    "ElastiCache": {
        "label": "Amazon ElastiCache\n(Redis Sub-ms Multi-AZ)",
        "tier": 4,
        "tier_name": "4. Subred Privada Datos",
        "res_icon": "mxgraph.aws4.elasticache",
        "fill_color": "#3B48CC",
    },
    "S3": {
        "label": "Amazon S3\n(Object Storage SSE-KMS)",
        "tier": 4,
        "tier_name": "4. Subred Privada Datos / Storage",
        "res_icon": "mxgraph.aws4.s3",
        "fill_color": "#3F8624",
    },
    "IAM": {
        "label": "AWS IAM\n(Roles STS & MFA)",
        "tier": 5,
        "tier_name": "5. Gobierno de Seguridad e Identidad",
        "res_icon": "mxgraph.aws4.identity_and_access_management",
        "fill_color": "#DD344C",
    },
    "SecretsManager": {
        "label": "AWS Secrets Manager\n(Rotación Credenciales)",
        "tier": 5,
        "tier_name": "5. Gobierno de Seguridad e Identidad",
        "res_icon": "mxgraph.aws4.secrets_manager",
        "fill_color": "#DD344C",
    },
    "KMS": {
        "label": "AWS KMS\n(Llaves Maestras CMK)",
        "tier": 5,
        "tier_name": "5. Gobierno de Seguridad e Identidad",
        "res_icon": "mxgraph.aws4.key_management_service",
        "fill_color": "#DD344C",
    },
    "CloudWatch": {
        "label": "Amazon CloudWatch\n(Métricas, Logs y Alertas)",
        "tier": 5,
        "tier_name": "5. Gobierno de Seguridad y Monitoreo",
        "res_icon": "mxgraph.aws4.cloudwatch",
        "fill_color": "#E7157B",
    },
}


# ==========================================================
# 2. CONSTRUCTOR DE XML DRAW.IO CON CONTENEDORES AWS4
# ==========================================================
def generate_proposal_drawio_xml(
    proposal_name: str = "Propuesta Cloud Diagnostix",
    region: str = "sa-east-1",
    selected_services: Optional[List[str]] = None,
    architecture_pattern: str = "Arquitectura Web Empresarial Multi-Capa (3-Tier High Availability)",
    rea_evaluation: Optional[Dict[str, Any]] = None,
    applied_scenario: str = "Recommended-Production",
) -> str:
    """
    Construye un documento XML `<mxfile>` completo para Draw.io con stencils
    oficiales `mxgraph.aws4` organizados jerárquicamente:
    - Contenedor AWS Cloud (`group_aws_cloud_alt`)
    - Contenedor Región AWS (`group_region`)
    - Contenedor Amazon VPC (`group_vpc2`)
    - 5 Capas Arquitectónicas (`group_security_group`) + Conectores ortogonales
    """
    rea_evaluation = rea_evaluation or {}
    selected_scenario = _get_rea_scenario(rea_evaluation, applied_scenario)
    if not selected_services:
        selected_services = _scenario_service_codes(selected_scenario)

    clean_services: List[str] = []
    for svc in selected_services:
        if svc in AWS4_STENCIL_CATALOG and svc not in clean_services:
            clean_services.append(svc)

    # Agrupar servicios en las 5 capas arquitectónicas (tiers 1..5)
    tiers: Dict[int, List[str]] = {1: [], 2: [], 3: [], 4: [], 5: []}
    for svc in clean_services:
        tiers[AWS4_STENCIL_CATALOG[svc]["tier"]].append(svc)

    safe_title = html.escape(f"{proposal_name} — {architecture_pattern} ({region})")
    safe_region = html.escape(region)

    cells: List[str] = [
        '<mxCell id="0" />',
        '<mxCell id="1" parent="0" />',
    ]

    rea_summary = _rea_summary_text(rea_evaluation, selected_scenario, clean_services)
    rea_panel_style = (
        "rounded=1;whiteSpace=wrap;html=1;fillColor=#EFF6FF;strokeColor=#2563EB;"
        "fontColor=#0F172A;fontStyle=1;verticalAlign=top;align=left;spacing=10;fontSize=11;"
    )
    cells.append(
        f'<mxCell id="rea_evaluation_summary" value="{html.escape(rea_summary).replace(chr(10), "&#xa;")}" '
        f'style="{rea_panel_style}" vertex="1" parent="1">'
        '<mxGeometry x="20" y="40" width="160" height="235" as="geometry" />'
        "</mxCell>"
    )

    # Contenedor 1: AWS Cloud
    aws_cloud_style = (
        "points=[[0,0],[0.25,0],[0.5,0],[0.75,0],[1,0],[1,0.25],[1,0.5],[1,0.75],[1,1],"
        "[0.75,1],[0.5,1],[0.25,1],[0,1],[0,0.75],[0,0.5],[0,0.25]];outlineConnect=0;"
        "gradientColor=none;html=1;whiteSpace=wrap;fontSize=13;fontStyle=1;container=1;"
        "pointerEvents=0;collapsible=0;recursiveResize=0;shape=mxgraph.aws4.group;"
        "grIcon=mxgraph.aws4.group_aws_cloud_alt;strokeColor=#232F3E;fillColor=none;"
        "verticalAlign=top;align=left;spacingLeft=30;fontColor=#232F3E;dashed=0;"
    )
    cells.append(
        f'<mxCell id="grp_aws_cloud" value="AWS Cloud — {safe_title}" style="{aws_cloud_style}" vertex="1" parent="1">'
        '<mxGeometry x="200" y="40" width="1220" height="680" as="geometry" />'
        "</mxCell>"
    )

    # Contenedor 2: Región AWS
    region_style = (
        "points=[[0,0],[0.25,0],[0.5,0],[0.75,0],[1,0],[1,0.25],[1,0.5],[1,0.75],[1,1],"
        "[0.75,1],[0.5,1],[0.25,1],[0,1],[0,0.75],[0,0.5],[0,0.25]];outlineConnect=0;"
        "gradientColor=none;html=1;whiteSpace=wrap;fontSize=12;fontStyle=1;container=1;"
        "pointerEvents=0;collapsible=0;recursiveResize=0;shape=mxgraph.aws4.group;"
        "grIcon=mxgraph.aws4.group_region;strokeColor=#00A4A6;fillColor=none;"
        "verticalAlign=top;align=left;spacingLeft=30;fontColor=#147EBA;dashed=1;"
    )
    cells.append(
        f'<mxCell id="grp_region" value="AWS Region: {safe_region}" style="{region_style}" vertex="1" parent="grp_aws_cloud">'
        '<mxGeometry x="210" y="50" width="980" height="600" as="geometry" />'
        "</mxCell>"
    )

    # Contenedor 3: Tier 1 Perímetro Global Edge
    edge_box_style = (
        "rounded=1;whiteSpace=wrap;html=1;container=1;collapsible=0;fillColor=#F5F3FF;"
        "strokeColor=#8C4FFF;fontStyle=1;verticalAlign=top;align=center;fontSize=11;fontColor=#5B21B6;"
    )
    cells.append(
        f'<mxCell id="grp_tier_1" value="1. Perímetro Global Edge" style="{edge_box_style}" vertex="1" parent="grp_aws_cloud">'
        '<mxGeometry x="25" y="50" width="165" height="600" as="geometry" />'
        "</mxCell>"
    )

    # Contenedor 4: Amazon VPC (/16)
    vpc_style = (
        "points=[[0,0],[0.25,0],[0.5,0],[0.75,0],[1,0],[1,0.25],[1,0.5],[1,0.75],[1,1],"
        "[0.75,1],[0.5,1],[0.25,1],[0,1],[0,0.75],[0,0.5],[0,0.25]];outlineConnect=0;"
        "gradientColor=none;html=1;whiteSpace=wrap;fontSize=12;fontStyle=1;container=1;"
        "pointerEvents=0;collapsible=0;recursiveResize=0;shape=mxgraph.aws4.group;"
        "grIcon=mxgraph.aws4.group_vpc2;strokeColor=#8C4FFF;fillColor=none;"
        "verticalAlign=top;align=left;spacingLeft=30;fontColor=#8C4FFF;dashed=0;"
    )
    cells.append(
        f'<mxCell id="grp_vpc" value="Amazon VPC (10.0.0.0/16 — Multi-AZ)" style="{vpc_style}" vertex="1" parent="grp_region">'
        '<mxGeometry x="25" y="45" width="710" height="530" as="geometry" />'
        "</mxCell>"
    )

    # Contenedores de Subred (Tiers 2, 3, 4) y Gobierno IAM (Tier 5)
    subnet_style = (
        "points=[[0,0],[0.25,0],[0.5,0],[0.75,0],[1,0],[1,0.25],[1,0.5],[1,0.75],[1,1],"
        "[0.75,1],[0.5,1],[0.25,1],[0,1],[0,0.75],[0,0.5],[0,0.25]];outlineConnect=0;"
        "gradientColor=none;html=1;whiteSpace=wrap;fontSize=11;fontStyle=1;container=1;"
        "pointerEvents=0;collapsible=0;recursiveResize=0;shape=mxgraph.aws4.group;"
        "grIcon=mxgraph.aws4.group_security_group;strokeColor=#00A4A6;fillColor=#F2F8FD;"
        "verticalAlign=top;align=left;spacingLeft=30;fontColor=#00A4A6;dashed=0;"
    )
    cells.append(
        f'<mxCell id="grp_tier_2" value="2. Subred Pública (Ingress)" style="{subnet_style}" vertex="1" parent="grp_vpc">'
        '<mxGeometry x="20" y="45" width="200" height="460" as="geometry" />'
        "</mxCell>"
    )
    cells.append(
        f'<mxCell id="grp_tier_3" value="3. Subred Privada App" style="{subnet_style}" vertex="1" parent="grp_vpc">'
        '<mxGeometry x="245" y="45" width="210" height="460" as="geometry" />'
        "</mxCell>"
    )
    cells.append(
        f'<mxCell id="grp_tier_4" value="4. Subred Privada Datos" style="{subnet_style}" vertex="1" parent="grp_vpc">'
        '<mxGeometry x="480" y="45" width="210" height="460" as="geometry" />'
        "</mxCell>"
    )

    iam_box_style = (
        "points=[[0,0],[0.25,0],[0.5,0],[0.75,0],[1,0],[1,0.25],[1,0.5],[1,0.75],[1,1],"
        "[0.75,1],[0.5,1],[0.25,1],[0,1],[0,0.75],[0,0.5],[0,0.25]];outlineConnect=0;"
        "gradientColor=none;html=1;whiteSpace=wrap;fontSize=11;fontStyle=1;container=1;"
        "pointerEvents=0;collapsible=0;recursiveResize=0;shape=mxgraph.aws4.group;"
        "grIcon=mxgraph.aws4.group_security_group;strokeColor=#DD344C;fillColor=#FEF6F6;"
        "verticalAlign=top;align=left;spacingLeft=30;fontColor=#DD344C;dashed=0;"
    )
    cells.append(
        f'<mxCell id="grp_tier_5" value="5. Gobierno IAM y Monitoreo" style="{iam_box_style}" vertex="1" parent="grp_region">'
        '<mxGeometry x="755" y="45" width="200" height="530" as="geometry" />'
        "</mxCell>"
    )

    # Nodo Clientes / Usuarios
    users_style = (
        "sketch=0;outlineConnect=0;fontColor=#232F3E;gradientColor=none;fillColor=#232F3E;"
        "strokeColor=none;dashed=0;verticalLabelPosition=bottom;verticalAlign=top;"
        "align=center;html=1;fontSize=11;fontStyle=1;aspect=fixed;pointerEvents=1;"
        "shape=mxgraph.aws4.users;"
    )
    cells.append(
        f'<mxCell id="node_users" value="Clientes / Usuarios&#xa;(HTTPS TLS 1.3)" style="{users_style}" vertex="1" parent="1">'
        '<mxGeometry x="55" y="310" width="68" height="68" as="geometry" />'
        "</mxCell>"
    )

    first_node_by_tier: Dict[int, str] = {}
    node_by_service: Dict[str, str] = {}

    for tier_idx in range(1, 6):
        parent_id = f"grp_tier_{tier_idx}"
        for i, svc_code in enumerate(tiers[tier_idx]):
            meta = AWS4_STENCIL_CATALOG[svc_code]
            node_id = f"node_{svc_code.replace(' ', '_')}"
            node_by_service[svc_code] = node_id
            if tier_idx not in first_node_by_tier:
                first_node_by_tier[tier_idx] = node_id

            label_xml = html.escape(meta["label"]).replace("\n", "&#xa;")
            style_str = (
                "sketch=0;points=[[0,0,0],[0.25,0,0],[0.5,0,0],[0.75,0,0],[1,0,0],[0,1,0],"
                "[0.25,1,0],[0.5,1,0],[0.75,1,0],[1,1,0],[0,0.25,0],[0,0.5,0],[0,0.75,0],"
                "[1,0.25,0],[1,0.5,0],[1,0.75,0]];outlineConnect=0;fontColor=#232F3E;"
                f"gradientColor=none;fillColor={meta['fill_color']};strokeColor=#ffffff;dashed=0;"
                "verticalLabelPosition=bottom;verticalAlign=top;align=center;html=1;"
                "fontSize=10;fontStyle=1;aspect=fixed;shape=mxgraph.aws4.resourceIcon;"
                f"resIcon={meta['res_icon']};"
            )
            pos_x = 52 if tier_idx == 1 else 70
            pos_y = 65 + (i * 115)
            cells.append(
                f'<mxCell id="{node_id}" value="{label_xml}" style="{style_str}" vertex="1" parent="{parent_id}">'
                f'<mxGeometry x="{pos_x}" y="{pos_y}" width="60" height="60" as="geometry" />'
                "</mxCell>"
            )

    # Conectores derivados de la arquitectura evaluada por REA.
    edge_style = (
        "edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;"
        "html=1;strokeColor=#232F3E;strokeWidth=2;fontSize=10;fontColor=#232F3E;"
    )
    flow_edges = _architecture_relationships(node_by_service, first_node_by_tier)
    for edge_index, (src, tgt, label) in enumerate(flow_edges, start=1):
        edge_id = f"edge_rea_{edge_index}"
        if src and tgt:
            cells.append(
                f'<mxCell id="{edge_id}" value="{html.escape(label)}" style="{edge_style}" '
                f'edge="1" parent="1" source="{src}" target="{tgt}">'
                '<mxGeometry relative="1" as="geometry" />'
                "</mxCell>"
            )

    joined_cells = "\n        ".join(cells)
    timestamp = datetime.now(timezone.utc).isoformat()
    return f"""<mxfile host="CloudDiagnostix-REA-MCP" modified="{timestamp}" agent="CloudDiagnostix-AWS4-Builder" version="24.7.8" type="device">
  <diagram id="aws4-architecture-rea" name="Arquitectura AWS4 — {safe_region}">
    <mxGraphModel dx="1422" dy="794" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="1600" pageHeight="900" math="0" shadow="0">
      <root>
        {joined_cells}
      </root>
    </mxGraphModel>
  </diagram>
    </mxfile>"""


def _get_rea_scenario(rea_evaluation: Dict[str, Any], applied_scenario: str) -> Dict[str, Any]:
    scenarios = rea_evaluation.get("scenarios") if isinstance(rea_evaluation, dict) else None
    if not isinstance(scenarios, list):
        return {}
    return next(
        (item for item in scenarios if isinstance(item, dict) and item.get("scenario_type") == applied_scenario),
        next((item for item in scenarios if isinstance(item, dict)), {}),
    )


def _scenario_service_codes(scenario: Dict[str, Any]) -> List[str]:
    result: List[str] = []
    for item in scenario.get("services", []) if isinstance(scenario, dict) else []:
        if not isinstance(item, dict):
            continue
        code = item.get("service_code") or item.get("service_name")
        if isinstance(code, str) and code in AWS4_STENCIL_CATALOG and code not in result:
            result.append(code)
    return result


def _rea_summary_text(rea_evaluation: Dict[str, Any], scenario: Dict[str, Any], services: List[str]) -> str:
    if not rea_evaluation:
        return "FICHA REA\nSin evaluación REA asociada.\nGenera una evaluación del proyecto para construir la arquitectura."
    pattern = str(rea_evaluation.get("architecture_pattern") or "No especificado")
    strategy = str(rea_evaluation.get("migration_strategy") or "No especificada")
    scenario_type = str(scenario.get("scenario_type") or "No aplicado")
    origin = str(rea_evaluation.get("origin_detected") or "Proyecto auditado")
    service_text = ", ".join(services) if services else "Sin servicios recomendados"
    return (
        "ARQUITECTURA EVALUADA POR REA\n"
        f"Origen: {origin[:52]}\n"
        f"Patrón: {pattern[:52]}\n"
        f"Estrategia: {strategy[:42]}\n"
        f"Escenario: {scenario_type}\n"
        f"Servicios: {service_text[:88]}"
    )


def _architecture_relationships(
    node_by_service: Dict[str, str],
    first_node_by_tier: Dict[int, str],
) -> List[tuple[str, str, str]]:
    """Construye relaciones entre los servicios presentes en la evaluación REA."""
    relations: List[tuple[str, str, str]] = []
    seen: set[tuple[str, str]] = set()

    def connect(source: Optional[str], target: Optional[str], label: str) -> None:
        if not source or not target or source == target or (source, target) in seen:
            return
        seen.add((source, target))
        relations.append((source, target, label))

    def node(code: str) -> Optional[str]:
        return node_by_service.get(code)

    ingress = node("ALB") or node("API Gateway") or first_node_by_tier.get(2)
    compute = node("ECS") or node("EKS") or node("EC2") or node("Lambda") or first_node_by_tier.get(3)
    data_nodes = [node(code) for code in ("RDS", "Aurora", "DynamoDB", "ElastiCache", "S3")]

    connect("node_users", node("Route 53") or node("CloudFront") or ingress or compute, "HTTPS / TLS 1.3")
    connect(node("Route 53"), node("CloudFront") or ingress, "DNS + health check")
    connect(node("CloudFront"), node("WAF") or ingress, "CDN / protección edge")
    connect(node("WAF"), ingress, "OWASP / filtrado")
    connect(ingress, compute, "Ingress hacia aplicación")
    connect(node("VPC"), ingress or compute, "Red privada Multi-AZ")
    for data in data_nodes:
        connect(compute, data, "Persistencia / almacenamiento")
    connect(compute, node("SQS"), "Eventos asíncronos")
    connect(node("SQS"), node("Lambda") or compute, "Procesamiento de eventos")
    connect(compute, node("SNS"), "Publicación de eventos")
    connect(node("IAM"), compute or ingress, "IAM / mínimo privilegio")
    connect(node("SecretsManager"), compute, "Secretos administrados")
    for target in [*data_nodes, node("SecretsManager")]:
        connect(node("KMS"), target, "Cifrado KMS")
    connect(compute or ingress, node("CloudWatch"), "Logs / métricas / alertas")

    for previous, current in zip(
        [first_node_by_tier.get(1), first_node_by_tier.get(2), first_node_by_tier.get(3), first_node_by_tier.get(4)],
        [first_node_by_tier.get(2), first_node_by_tier.get(3), first_node_by_tier.get(4), first_node_by_tier.get(5)],
    ):
        connect(previous, current, "Flujo de arquitectura REA")
    return relations


def build_reactflow_graph(
    proposal_name: str,
    region: str,
    selected_services: Optional[List[str]] = None,
    rea_evaluation: Optional[Dict[str, Any]] = None,
    applied_scenario: str = "Recommended-Production",
) -> Dict[str, Any]:
    """Genera React Flow desde la misma arquitectura REA usada para Draw.io."""
    rea_evaluation = rea_evaluation or {}
    scenario = _get_rea_scenario(rea_evaluation, applied_scenario)
    service_codes = selected_services or _scenario_service_codes(scenario)
    clean_services = [svc for svc in service_codes if svc in AWS4_STENCIL_CATALOG]
    tiers: Dict[int, List[str]] = {1: [], 2: [], 3: [], 4: [], 5: []}
    for service in clean_services:
        tiers[AWS4_STENCIL_CATALOG[service]["tier"]].append(service)

    nodes: List[Dict[str, Any]] = [{
        "id": "node_users",
        "position": {"x": 20, "y": 290},
        "data": {"label": f"Usuarios / Internet\n{proposal_name}", "kind": "entry"},
        "style": {"background": "#eff6ff", "border": "2px solid #2563eb", "borderRadius": 10, "padding": 12, "width": 190},
    }]
    first_node_by_tier: Dict[int, str] = {}
    node_by_service: Dict[str, str] = {}
    tier_x = {1: 260, 2: 480, 3: 700, 4: 920, 5: 1140}
    for tier, tier_services in tiers.items():
        for index, code in enumerate(tier_services):
            node_id = f"node_{code.replace(' ', '_')}"
            node_by_service[code] = node_id
            first_node_by_tier.setdefault(tier, node_id)
            item = next((item for item in scenario.get("services", []) if isinstance(item, dict) and item.get("service_code") == code), {})
            reason = str(item.get("reason") or "Servicio recomendado por REA")
            nodes.append({
                "id": node_id,
                "position": {"x": tier_x[tier], "y": 90 + index * 135},
                "data": {"label": AWS4_STENCIL_CATALOG[code]["label"].replace("\n", " — "), "serviceCode": code, "reason": reason, "tier": tier},
                "style": {"background": "#ffffff", "border": f"2px solid {AWS4_STENCIL_CATALOG[code]['fill_color']}", "borderRadius": 10, "padding": 12, "width": 190},
            })

    if not clean_services:
        nodes.append({
            "id": "rea_pending",
            "position": {"x": 320, "y": 220},
            "data": {"label": "Sin arquitectura evaluada\nEjecuta REA sobre un proyecto"},
            "style": {"background": "#fff7ed", "border": "2px solid #f97316", "borderRadius": 10, "padding": 12, "width": 260},
        })

    edges = [
        {"id": f"edge_rea_{index}", "source": source, "target": target, "label": label, "animated": True, "style": {"stroke": "#2563eb", "strokeWidth": 2}}
        for index, (source, target, label) in enumerate(_architecture_relationships(node_by_service, first_node_by_tier), start=1)
    ]
    return {
        "nodes": nodes,
        "edges": edges,
        "metadata": {
            "proposal_name": proposal_name,
            "region": region,
            "architecture_pattern": rea_evaluation.get("architecture_pattern"),
            "migration_strategy": rea_evaluation.get("migration_strategy"),
            "scenario_type": scenario.get("scenario_type"),
            "origin_detected": rea_evaluation.get("origin_detected"),
        },
    }


def validate_drawio_xml(xml_content: str) -> Dict[str, Any]:
    """
    Verifica que un XML recibido en `PUT /api/v1/proposals/{id}/diagrams/drawio`
    sea un documento XML válido y contenga estructura Draw.io (`<mxfile>` o `<mxGraphModel>`).
    """
    try:
        root = ET.fromstring(xml_content)
        if root.tag not in ("mxfile", "mxGraphModel"):
            return {"valid": False, "error": "El nodo raíz debe ser <mxfile> o <mxGraphModel>."}
        cells = root.findall(".//mxCell")
        return {"valid": True, "total_cells": len(cells)}
    except ET.ParseError as exc:
        return {"valid": False, "error": f"XML inválido: {exc}"}

