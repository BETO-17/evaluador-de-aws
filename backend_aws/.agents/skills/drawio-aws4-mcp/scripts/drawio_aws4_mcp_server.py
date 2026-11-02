"""
===============================================================================
PROYECTO: Cloud Diagnostix — AWS Cloud Suite Backend
MÓDULO: .agents/skills/drawio-aws4-mcp/scripts/drawio_aws4_mcp_server.py
CAPA ARQUITECTÓNICA: MCP Server & Servicio Generador de Diagramas AWS4 (Draw.io)
DESCRIPCIÓN:
    Servidor Model Context Protocol (MCP) sobre transporte Stdio (JSON-RPC 2.0)
    y motor generador de XML Draw.io con stencils oficiales 'mxgraph.aws4'.
    Permite al agente y al backend FastAPI construir, validar y persistir
    diagramas de arquitectura AWS organizados en las 5 capas del Motor REA.
INTEGRACIÓN FRONTEND / BD:
    - Frontend: src/features/modules/aws-cloud/components/AwsDrawioEditor.tsx
    - Base de Datos: Tabla architecture_diagrams (columna drawio_xml)
    - Referencia Contexto: context_backend/04_SEGURIDAD_IAM_TOTP_Y_DIAGRAMAS_AWS4.md
===============================================================================
"""

import html
import json
import os
import sys
import xml.etree.ElementTree as ET
from datetime import datetime
from typing import Any, Dict, List, Optional

BACKEND_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../../"))
if BACKEND_ROOT not in sys.path:
    sys.path.insert(0, BACKEND_ROOT)
try:
    from app.services.drawio_aws4_builder import generate_proposal_drawio_xml as backend_drawio_generator
except Exception:  # MCP standalone fallback
    backend_drawio_generator = None


# ==========================================================
# 1. CATÁLOGO OFICIAL DE STENCILS AWS4 POR CAPA ARQUITECTÓNICA
# ==========================================================
# Cada servicio del catálogo REA se mapea a su capa (tier 1..5), su icono
# oficial mxgraph.aws4 y su color corporativo hexadecimal de Amazon Web Services.
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
# 2. GENERADOR DE XML DRAW.IO CON STENCILS MXGRAPH.AWS4
# ==========================================================
def build_aws4_drawio_xml(
    proposal_name: str = "Propuesta Cloud Diagnostix",
    region: str = "sa-east-1",
    selected_services: Optional[List[str]] = None,
    architecture_pattern: str = "Arquitectura Web Empresarial Multi-Capa (3-Tier High Availability)",
) -> str:
    """
    Construye el documento XML completo de Draw.io (<mxfile>) usando contenedores
    oficiales 'shape=mxgraph.aws4.group' e iconos 'shape=mxgraph.aws4.resourceIcon'.

    Parámetros:
        proposal_name: Nombre de la solución o propuesta cloud.
        region: Región AWS objetivo (ej. 'sa-east-1', 'us-east-1').
        selected_services: Lista de códigos de servicios AWS evaluados por REA.
        architecture_pattern: Patrón arquitectónico detectado por el Motor REA.

    Retorna:
        Cadena XML válida lista para renderizar en AwsDrawioEditor.tsx o guardar como .drawio.
    """
    if not selected_services:
        selected_services = ["Route 53", "CloudFront", "ALB", "VPC", "EC2", "RDS", "S3", "IAM", "CloudWatch"]

    # Normalizar y preservar orden evitando duplicados
    clean_services: List[str] = []
    for svc in selected_services:
        if svc in AWS4_STENCIL_CATALOG and svc not in clean_services:
            clean_services.append(svc)

    # Clasificar servicios en sus 5 capas arquitectónicas (tiers)
    tiers: Dict[int, List[str]] = {1: [], 2: [], 3: [], 4: [], 5: []}
    for svc in clean_services:
        tier_num = AWS4_STENCIL_CATALOG[svc]["tier"]
        tiers[tier_num].append(svc)

    # Asegurar servicios mínimos por capa para mantener coherencia visual si una capa está vacía
    if not tiers[1]:
        tiers[1].append("Route 53")
    if not tiers[2]:
        tiers[2].append("ALB")
    if not tiers[3]:
        tiers[3].append("EC2")
    if not tiers[4]:
        tiers[4].append("RDS")
    if not tiers[5]:
        tiers[5].append("IAM")

    safe_title = html.escape(f"{proposal_name} — {architecture_pattern} ({region})")
    safe_region = html.escape(region)

    cells: List[str] = [
        '<mxCell id="0" />',
        '<mxCell id="1" parent="0" />',
    ]

    # ----------------------------------------------------------
    # CONTENEDORES JERÁRQUICOS OFICIALES AWS4
    # ----------------------------------------------------------
    # 1. Contenedor principal AWS Cloud
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

    # 2. Contenedor de Región AWS (dentro de AWS Cloud)
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

    # 3. Contenedor Tier 1: Perímetro Global Edge (en AWS Cloud antes de entrar a la VPC)
    edge_box_style = (
        "rounded=1;whiteSpace=wrap;html=1;container=1;collapsible=0;fillColor=#F5F3FF;"
        "strokeColor=#8C4FFF;fontStyle=1;verticalAlign=top;align=center;fontSize=11;fontColor=#5B21B6;"
    )
    cells.append(
        f'<mxCell id="grp_tier_1" value="1. Perímetro Global Edge" style="{edge_box_style}" vertex="1" parent="grp_aws_cloud">'
        '<mxGeometry x="25" y="50" width="165" height="600" as="geometry" />'
        "</mxCell>"
    )

    # 4. Contenedor Amazon VPC (/16) dentro de la Región AWS
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

    # 5. Subredes dentro de la VPC (Tiers 2, 3 y 4) y Gobierno IAM (Tier 5)
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

    # ----------------------------------------------------------
    # NODO EXTERNO DE CLIENTES / USUARIOS
    # ----------------------------------------------------------
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

    # ----------------------------------------------------------
    # POSICIONAMIENTO DE ICONOS OFICIALES AWS4 POR CAPA
    # ----------------------------------------------------------
    def make_resource_style(res_icon: str, fill_color: str) -> str:
        """Construye la cadena de estilo Draw.io para un icono oficial mxgraph.aws4.resourceIcon."""
        return (
            "sketch=0;points=[[0,0,0],[0.25,0,0],[0.5,0,0],[0.75,0,0],[1,0,0],[0,1,0],"
            "[0.25,1,0],[0.5,1,0],[0.75,1,0],[1,1,0],[0,0.25,0],[0,0.5,0],[0,0.75,0],"
            "[1,0.25,0],[1,0.5,0],[1,0.75,0]];outlineConnect=0;fontColor=#232F3E;"
            f"gradientColor=none;fillColor={fill_color};strokeColor=#ffffff;dashed=0;"
            "verticalLabelPosition=bottom;verticalAlign=top;align=center;html=1;"
            "fontSize=10;fontStyle=1;aspect=fixed;shape=mxgraph.aws4.resourceIcon;"
            f"resIcon={res_icon};"
        )

    first_node_by_tier: Dict[int, str] = {}

    for tier_idx in range(1, 6):
        parent_id = f"grp_tier_{tier_idx}"
        tier_services = tiers[tier_idx]
        start_y = 65
        spacing_y = 115

        for i, svc_code in enumerate(tier_services):
            meta = AWS4_STENCIL_CATALOG[svc_code]
            node_id = f"node_{svc_code.replace(' ', '_')}"
            if tier_idx not in first_node_by_tier:
                first_node_by_tier[tier_idx] = node_id

            label_xml = html.escape(meta["label"]).replace("\n", "&#xa;")
            style_str = make_resource_style(meta["res_icon"], meta["fill_color"])
            pos_x = 52 if tier_idx == 1 else 70
            pos_y = start_y + (i * spacing_y)

            cells.append(
                f'<mxCell id="{node_id}" value="{label_xml}" style="{style_str}" vertex="1" parent="{parent_id}">'
                f'<mxGeometry x="{pos_x}" y="{pos_y}" width="60" height="60" as="geometry" />'
                "</mxCell>"
            )

    # ----------------------------------------------------------
    # CONECTORES DE FLUJO ARQUITECTÓNICO ENTRE CAPAS
    # ----------------------------------------------------------
    edge_style = (
        "edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;"
        "html=1;strokeColor=#232F3E;strokeWidth=2;fontSize=10;fontColor=#232F3E;"
    )

    flow_edges = [
        ("edge_users_t1", "node_users", first_node_by_tier.get(1, ""), "HTTPS / TLS 1.3"),
        ("edge_t1_t2", first_node_by_tier.get(1, ""), first_node_by_tier.get(2, ""), "Edge Ingress"),
        ("edge_t2_t3", first_node_by_tier.get(2, ""), first_node_by_tier.get(3, ""), "Balanceo Multi-AZ"),
        ("edge_t3_t4", first_node_by_tier.get(3, ""), first_node_by_tier.get(4, ""), "Persistencia Privada"),
    ]

    for edge_id, src, tgt, label in flow_edges:
        if src and tgt:
            cells.append(
                f'<mxCell id="{edge_id}" value="{html.escape(label)}" style="{edge_style}" '
                f'edge="1" parent="1" source="{src}" target="{tgt}">'
                '<mxGeometry relative="1" as="geometry" />'
                "</mxCell>"
            )

    # Conector punteado de auditoría/seguridad IAM hacia Cómputo
    if first_node_by_tier.get(5) and first_node_by_tier.get(3):
        iam_edge_style = (
            "edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;"
            "html=1;strokeColor=#DD344C;strokeWidth=1.5;dashed=1;fontSize=10;fontColor=#DD344C;"
        )
        cells.append(
            f'<mxCell id="edge_iam_gov" value="STS Least Privilege / KMS" style="{iam_edge_style}" '
            f'edge="1" parent="1" source="{first_node_by_tier[5]}" target="{first_node_by_tier[3]}">'
            '<mxGeometry relative="1" as="geometry" />'
            "</mxCell>"
        )

    joined_cells = "\n        ".join(cells)
    timestamp = datetime.utcnow().isoformat()

    return f"""<mxfile host="CloudDiagnostix-REA-MCP" modified="{timestamp}" agent="CloudDiagnostix-AWS4-Builder" version="24.7.8" type="device">
  <diagram id="aws4-architecture-rea" name="Arquitectura AWS4 — {safe_region}">
    <mxGraphModel dx="1422" dy="794" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="1600" pageHeight="900" math="0" shadow="0">
      <root>
        {joined_cells}
      </root>
    </mxGraphModel>
  </diagram>
</mxfile>"""


def validate_drawio_aws4_xml(xml_content: str) -> Dict[str, Any]:
    """
    Valida que un documento XML de Draw.io sea sintácticamente correcto y contenga
    nodos con stencils oficiales 'mxgraph.aws4'.
    """
    try:
        root = ET.fromstring(xml_content)
    except ET.ParseError as exc:
        return {"valid": False, "error": f"XML mal formado: {exc}"}

    if root.tag != "mxfile":
        return {"valid": False, "error": "El nodo raíz debe ser <mxfile>."}

    cells = root.findall(".//mxCell")
    aws4_groups = 0
    aws4_icons = 0
    for cell in cells:
        style = cell.attrib.get("style", "")
        if "mxgraph.aws4.group" in style:
            aws4_groups += 1
        if "mxgraph.aws4.resourceIcon" in style or "mxgraph.aws4.users" in style:
            aws4_icons += 1

    return {
        "valid": True,
        "total_cells": len(cells),
        "aws4_groups_count": aws4_groups,
        "aws4_icons_count": aws4_icons,
        "uses_official_aws4_stencils": (aws4_groups > 0 and aws4_icons > 0),
    }


# ==========================================================
# 3. PROTOCOLO SERVIDOR MCP SOBRE TRANSPORTE STDIO (JSON-RPC 2.0)
# ==========================================================
MCP_TOOLS_SPEC: List[Dict[str, Any]] = [
    {
        "name": "generate_aws4_drawio_xml",
        "description": (
            "Genera un diagrama XML de Draw.io (.drawio) con contenedores e iconos "
            "oficiales mxgraph.aws4 distribuidos en las 5 capas arquitectónicas del Motor REA."
        ),
        "inputSchema": {
            "type": "object",
            "properties": {
                "proposal_name": {
                    "type": "string",
                    "description": "Nombre de la propuesta o sistema evaluado.",
                },
                "region": {
                    "type": "string",
                    "description": "Región AWS objetivo (ej. sa-east-1, us-east-1).",
                    "default": "sa-east-1",
                },
                "selected_services": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "Lista de códigos de servicios AWS del catálogo REA.",
                },
                "applied_scenario": {"type": "string"},
                "rea_evaluation": {"type": "object"},
                "architecture_pattern": {
                    "type": "string",
                    "description": "Patrón arquitectónico detectado por REA.",
                },
            },
            "required": ["proposal_name"],
        },
    },
    {
        "name": "save_drawio_diagram_file",
        "description": "Genera y guarda un archivo .drawio con iconos oficiales mxgraph.aws4 en la ruta indicada.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "output_path": {
                    "type": "string",
                    "description": "Ruta del archivo .drawio a guardar.",
                },
                "proposal_name": {"type": "string"},
                "region": {"type": "string", "default": "sa-east-1"},
                "selected_services": {
                    "type": "array",
                    "items": {"type": "string"},
                },
            },
            "required": ["output_path", "proposal_name"],
        },
    },
    {
        "name": "list_aws4_stencils_catalog",
        "description": "Lista el catálogo oficial de 21 stencils mxgraph.aws4 con su capa (tier) y fillColor.",
        "inputSchema": {
            "type": "object",
            "properties": {},
        },
    },
    {
        "name": "validate_drawio_aws4_xml",
        "description": "Valida que una cadena XML de Draw.io sea válida y utilice stencils oficiales mxgraph.aws4.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "xml_content": {
                    "type": "string",
                    "description": "Contenido XML del diagrama Draw.io.",
                }
            },
            "required": ["xml_content"],
        },
    },
]


def handle_mcp_request(request: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """
    Procesa un mensaje JSON-RPC 2.0 del protocolo MCP y devuelve la respuesta correspondiente.
    """
    method = request.get("method", "")
    req_id = request.get("id")
    params = request.get("params") or {}

    # Las notificaciones (sin id) no requieren respuesta JSON-RPC
    if req_id is None:
        return None

    if method == "initialize":
        return {
            "jsonrpc": "2.0",
            "id": req_id,
            "result": {
                "protocolVersion": "2024-11-05",
                "capabilities": {"tools": {}},
                "serverInfo": {
                    "name": "clouddiagnostix-drawio-aws4-mcp",
                    "version": "1.0.0",
                },
            },
        }

    if method == "tools/list":
        return {
            "jsonrpc": "2.0",
            "id": req_id,
            "result": {"tools": MCP_TOOLS_SPEC},
        }

    if method == "tools/call":
        tool_name = params.get("name")
        args = params.get("arguments") or {}

        try:
            if tool_name == "generate_aws4_drawio_xml":
                generator = backend_drawio_generator or build_aws4_drawio_xml
                generator_kwargs = {
                    "proposal_name": args.get("proposal_name", "Propuesta Cloud Diagnostix"),
                    "region": args.get("region", "sa-east-1"),
                    "selected_services": args.get("selected_services"),
                    "architecture_pattern": args.get("architecture_pattern", "Arquitectura Web Empresarial Multi-Capa (3-Tier High Availability)"),
                }
                if backend_drawio_generator:
                    generator_kwargs["rea_evaluation"] = args.get("rea_evaluation")
                    generator_kwargs["applied_scenario"] = args.get("applied_scenario", "Recommended-Production")
                xml_out = generator(
                    **generator_kwargs,
                )
                return {
                    "jsonrpc": "2.0",
                    "id": req_id,
                    "result": {"content": [{"type": "text", "text": xml_out}]},
                }

            if tool_name == "save_drawio_diagram_file":
                output_path = args["output_path"]
                generator = backend_drawio_generator or build_aws4_drawio_xml
                generator_kwargs = {
                    "proposal_name": args.get("proposal_name", "Propuesta Cloud Diagnostix"),
                    "region": args.get("region", "sa-east-1"),
                    "selected_services": args.get("selected_services"),
                }
                if backend_drawio_generator:
                    generator_kwargs["architecture_pattern"] = args.get("architecture_pattern", "Arquitectura Web Empresarial Multi-Capa (3-Tier High Availability)")
                    generator_kwargs["rea_evaluation"] = args.get("rea_evaluation")
                    generator_kwargs["applied_scenario"] = args.get("applied_scenario", "Recommended-Production")
                xml_out = generator(
                    **generator_kwargs,
                )
                os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
                with open(output_path, "w", encoding="utf-8") as f:
                    f.write(xml_out)
                validation = validate_drawio_aws4_xml(xml_out)
                return {
                    "jsonrpc": "2.0",
                    "id": req_id,
                    "result": {
                        "content": [
                            {
                                "type": "text",
                                "text": json.dumps(
                                    {"saved_to": output_path, "validation": validation},
                                    ensure_ascii=False,
                                    indent=2,
                                ),
                            }
                        ]
                    },
                }

            if tool_name == "list_aws4_stencils_catalog":
                return {
                    "jsonrpc": "2.0",
                    "id": req_id,
                    "result": {
                        "content": [
                            {
                                "type": "text",
                                "text": json.dumps(AWS4_STENCIL_CATALOG, ensure_ascii=False, indent=2),
                            }
                        ]
                    },
                }

            if tool_name == "validate_drawio_aws4_xml":
                report = validate_drawio_aws4_xml(args.get("xml_content", ""))
                return {
                    "jsonrpc": "2.0",
                    "id": req_id,
                    "result": {
                        "content": [
                            {
                                "type": "text",
                                "text": json.dumps(report, ensure_ascii=False, indent=2),
                            }
                        ]
                    },
                }

            return {
                "jsonrpc": "2.0",
                "id": req_id,
                "error": {"code": -32601, "message": f"Herramienta MCP desconocida: {tool_name}"},
            }
        except Exception as exc:
            return {
                "jsonrpc": "2.0",
                "id": req_id,
                "error": {"code": -32000, "message": f"Error ejecutando {tool_name}: {exc}"},
            }

    return {
        "jsonrpc": "2.0",
        "id": req_id,
        "error": {"code": -32601, "message": f"Método no soportado: {method}"},
    }


def main_stdio_loop() -> None:
    """Bucle principal Stdio para comunicación con el cliente MCP de Antigravity."""
    for line in sys.stdin:
        line_str = line.strip()
        if not line_str:
            continue
        try:
            req = json.loads(line_str)
            resp = handle_mcp_request(req)
            if resp is not None:
                sys.stdout.write(json.dumps(resp, ensure_ascii=False) + "\n")
                sys.stdout.flush()
        except Exception as exc:
            err_resp = {
                "jsonrpc": "2.0",
                "id": None,
                "error": {"code": -32700, "message": f"JSON Parse error: {exc}"},
            }
            sys.stdout.write(json.dumps(err_resp, ensure_ascii=False) + "\n")
            sys.stdout.flush()


if __name__ == "__main__":
    main_stdio_loop()

