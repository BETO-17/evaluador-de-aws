"""
===============================================================================
PROYECTO: Cloud Diagnostix — AWS Cloud Suite Backend
MÓDULO: app/services/pricing_calculator.py
CAPA ARQUITECTÓNICA: Services (Motor de Dimensionamiento y Calculadora FinOps AWS)
DESCRIPCIÓN:
    Contiene el catálogo oficial de los 19 servicios de Amazon Web Services
    soportados por el Motor REA, los multiplicadores de tráfico y región, y las
    funciones de cálculo FinOps sobre el estándar de 730 horas/mes.
INTEGRACIÓN FRONTEND / BD:
    - Frontend: analyzerService.ts y Simulador FinOps en AwsPlanning.tsx
    - Base de Datos: Tablas `proposal_rea_evaluations` y `cost_simulation_items`
    - Referencia Contexto: context_backend/03_MOTOR_REA_E_INTELIGENCIA_ARTIFICIAL.md
===============================================================================
"""

from typing import Any, Dict, List


# ==========================================================
# 1. CATÁLOGO OFICIAL DE 19 SERVICIOS AWS PARA EL MOTOR REA
# ==========================================================
# [REGLA DE NEGOCIO - CATÁLOGO OFICIAL]:
# Este diccionario constituye la única fuente de verdad de precios unitarios
# mensuales (730 horas/mes), categorías y justificaciones Well-Architected.
AWS_REA_CATALOG: Dict[str, Dict[str, Any]] = {
    "Route 53": {
        "service_name": "Amazon Route 53 (DNS Cloud)",
        "category": "Redes y CDN",
        "role": "Resolución DNS Global y Health Checks",
        "specs": "Hosted Zone Pública + Enrutamiento con chequeo de salud HTTPS",
        "unit_cost": 0.50,
        "reason": "Gestiona el dominio corporativo con baja latencia y failover automático.",
    },
    "CloudFront": {
        "service_name": "Amazon CloudFront (CDN)",
        "category": "Redes y CDN",
        "role": "Red de Entrega de Contenido (CDN) y Caché Edge",
        "specs": "Distribución Global Edge (500 GB transferencia saliente) + TLS 1.3",
        "unit_cost": 42.50,
        "reason": "Acelera la entrega del frontend y reduce la carga directa sobre el origen.",
    },
    "WAF": {
        "service_name": "AWS WAF (Web Application Firewall)",
        "category": "Seguridad e Identidad",
        "role": "Protección Perimetral OWASP Top 10",
        "specs": "Web ACL + Reglas Administradas Anti-SQLi y Anti-XSS",
        "unit_cost": 15.00,
        "reason": "Filtra tráfico malicioso y protege los endpoints de aplicación.",
    },
    "ALB": {
        "service_name": "Elastic Load Balancing (ALB)",
        "category": "Redes y CDN",
        "role": "Balanceo de Carga de Aplicación (Capa 7)",
        "specs": "Application Load Balancer Multi-AZ con terminación SSL/TLS",
        "unit_cost": 16.43,
        "reason": "Distribuye peticiones HTTP/HTTPS entre múltiples instancias sanas Multi-AZ.",
    },
    "VPC": {
        "service_name": "Amazon Virtual Private Cloud (VPC)",
        "category": "Redes y CDN",
        "role": "Aislamiento Lógico de Red Cloud",
        "specs": "VPC /16 con Subredes Públicas/Privadas, IGW y Security Groups",
        "unit_cost": 0.00,
        "reason": "Segmenta el tráfico perimetral y aísla las bases de datos sin exposición pública.",
    },
    "EC2": {
        "service_name": "Amazon Elastic Compute Cloud (EC2)",
        "category": "Cómputo",
        "role": "Capa de Cómputo de Aplicación",
        "specs": "t3.large (2 vCPU, 8 GB RAM) · Auto Scaling Multi-AZ",
        "unit_cost": 60.74,
        "reason": "Dimensionado por REA para soportar la concurrencia estimada con balanceo elástico.",
    },
    "ECS": {
        "service_name": "Amazon Elastic Container Service (ECS Fargate)",
        "category": "Cómputo",
        "role": "Orquestación Serverless de Contenedores Docker",
        "specs": "Tasks Fargate (1 vCPU, 2 GB RAM) · Auto Scaling Multi-AZ",
        "unit_cost": 33.58,
        "reason": "Ejecuta contenedores detectados en Dockerfile sin administrar servidores EC2.",
    },
    "Lambda": {
        "service_name": "AWS Lambda (Serverless Compute)",
        "category": "Serverless",
        "role": "Procesamiento Serverless por Eventos",
        "specs": "Funciones Node.js/Python (512 MB RAM · 1M invocaciones/mes)",
        "unit_cost": 8.50,
        "reason": "Ejecuta tareas asíncronas y webhooks con escalado instantáneo a cero.",
    },
    "RDS": {
        "service_name": "Amazon Relational Database Service (RDS)",
        "category": "Base de Datos",
        "role": "Persistencia Transaccional Relacional",
        "specs": "db.t3.large PostgreSQL · Despliegue Multi-AZ con failover automático",
        "unit_cost": 127.75,
        "reason": "Garantiza integridad ACID, respaldos automatizados y alta disponibilidad en subred privada.",
    },
    "Aurora": {
        "service_name": "Amazon Aurora (PostgreSQL / MySQL)",
        "category": "Base de Datos",
        "role": "Base de Datos Relacional de Misión Crítica",
        "specs": "Cluster Aurora Serverless v2 Multi-AZ con réplicas de lectura",
        "unit_cost": 175.20,
        "reason": "Replicación distribuida en 3 zonas de disponibilidad con failover sub-segundo.",
    },
    "DynamoDB": {
        "service_name": "Amazon DynamoDB",
        "category": "Base de Datos",
        "role": "Persistencia NoSQL de Baja Latencia",
        "specs": "Tablas On-Demand con cifrado KMS y Point-in-Time Recovery",
        "unit_cost": 25.00,
        "reason": "Almacenamiento clave-valor y documental con latencia de un dígito de milisegundo.",
    },
    "ElastiCache": {
        "service_name": "Amazon ElastiCache (Redis)",
        "category": "Base de Datos",
        "role": "Caché en Memoria y Sesiones",
        "specs": "cache.t4g.medium Redis Multi-AZ",
        "unit_cost": 37.96,
        "reason": "Acelera consultas frecuentes y gestiona sesiones distribuidas.",
    },
    "S3": {
        "service_name": "Amazon Simple Storage Service (S3)",
        "category": "Almacenamiento",
        "role": "Almacenamiento de Objetos y Activos Estáticos",
        "specs": "S3 Standard (100 GB) · Versionado y cifrado SSE-KMS activo",
        "unit_cost": 2.30,
        "reason": "Desacopla el almacenamiento de archivos, reportes y activos estáticos con durabilidad de 11 nueves.",
    },
    "SQS": {
        "service_name": "Amazon Simple Queue Service (SQS)",
        "category": "Serverless",
        "role": "Cola de Mensajería Asíncrona",
        "specs": "Colas FIFO/Standard para desacoplamiento de eventos",
        "unit_cost": 4.00,
        "reason": "Evita cuellos de botella procesando órdenes y tareas pesadas en segundo plano.",
    },
    "SNS": {
        "service_name": "Amazon Simple Notification Service (SNS)",
        "category": "Serverless",
        "role": "Notificaciones Pub/Sub y Eventos",
        "specs": "Tópicos Pub/Sub de Eventos Transaccionales",
        "unit_cost": 3.50,
        "reason": "Distribuye alertas operativas y eventos de dominio en tiempo real.",
    },
    "IAM": {
        "service_name": "AWS Identity and Access Management (IAM)",
        "category": "Seguridad e Identidad",
        "role": "Gobierno de Identidad y Mínimo Privilegio",
        "specs": "Roles IAM STS para EC2/ECS, Políticas RBAC y MFA obligatorio",
        "unit_cost": 0.00,
        "reason": "Elimina credenciales estáticas en código y aplica principio de menor privilegio.",
    },
    "SecretsManager": {
        "service_name": "AWS Secrets Manager",
        "category": "Seguridad e Identidad",
        "role": "Custodia y Rotación de Credenciales",
        "specs": "Rotación automática de secretos de BD y API",
        "unit_cost": 4.00,
        "reason": "Protege cadenas de conexión y claves API con rotación criptográfica automatizada.",
    },
    "KMS": {
        "service_name": "AWS Key Management Service (KMS)",
        "category": "Seguridad e Identidad",
        "role": "Cifrado Criptográfico en Reposo (CMK)",
        "specs": "Claves Maestras CMK con rotación automática anual",
        "unit_cost": 3.00,
        "reason": "Cifra volúmenes EBS, buckets S3 y bases de datos RDS para cumplimiento normativo.",
    },
    "CloudWatch": {
        "service_name": "Amazon CloudWatch",
        "category": "Monitoreo y Gestión",
        "role": "Observabilidad, Métricas y Alertas",
        "specs": "Dashboards de telemetría, Logs centralizados y Alarmas de CPU/Latencia",
        "unit_cost": 12.00,
        "reason": "Permite detección temprana de anomalías y auditoría operativa en tiempo real.",
    },
}

OFFICIAL_SERVICE_CODES: List[str] = list(AWS_REA_CATALOG.keys())


# ==========================================================
# 2. MULTIPLICADORES DE TRÁFICO Y FUNCIONES DE CÁLCULO FINOPS
# ==========================================================
# [REGLA DE NEGOCIO - TRAFFIC TIERS]:
# Escala los costos unitarios según el nivel de concurrencia esperado por el usuario.
TRAFFIC_TIER_MULTIPLIERS: Dict[str, float] = {
    "low": 0.70,        # <25k req/mes
    "medium": 1.00,     # 100k - 500k req/mes
    "high": 1.40,       # >1M req/mes
    "enterprise": 1.80, # Misión crítica global
}


def build_scenario_service_items(
    service_codes: List[str],
    factor: float,
    compute_qty: int,
) -> List[Dict[str, Any]]:
    """
    Construye el listado de servicios dimensionados para un escenario REA
    (`Cost-Optimized`, `Recommended-Production` o `High-Availability-Enterprise`).

    Parámetros:
        service_codes: Códigos de servicios AWS a incluir en el escenario.
        factor: Multiplicador combinado de escenario y nivel de tráfico.
        compute_qty: Cantidad de instancias/tasks para servicios de cómputo (`EC2`, `ECS`).
    """
    items: List[Dict[str, Any]] = []
    for code in service_codes:
        meta = AWS_REA_CATALOG.get(code, AWS_REA_CATALOG["EC2"])
        # Los servicios de cómputo escalan horizontalmente según compute_qty (1x, 2x o 3x)
        qty = compute_qty if code in ("EC2", "ECS") else 1
        unit_cost = round(meta["unit_cost"] * factor, 2)
        total_monthly = round(unit_cost * qty, 2)
        items.append(
            {
                "service_name": meta["service_name"],
                "service_code": code,
                "category": meta["category"],
                "role": meta["role"],
                "specs": meta["specs"],
                "quantity": qty,
                "estimated_unit_cost_usd": unit_cost,
                "total_monthly_usd": total_monthly,
                "reason": meta["reason"],
            }
        )
    return items


def summarize_scenario_pricing(items: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Suma el costo mensual de todos los servicios de un escenario y proyecta el
    presupuesto anual (`monthly_total_usd * 12`) en dólares estadounidenses (`USD`).
    """
    monthly_total = round(sum(float(i["total_monthly_usd"]) for i in items), 2)
    return {
        "monthly_total_usd": monthly_total,
        "annual_total_usd": round(monthly_total * 12, 2),
        "currency": "USD",
    }


def build_finops_simulation_rows(
    selected_services: List[str],
    traffic_tier: str = "medium",
) -> List[Dict[str, Any]]:
    """
    Genera las filas detalladas para la tabla `cost_simulation_items` usando
    la base estándar de 730 horas operativas por mes.
    """
    factor = TRAFFIC_TIER_MULTIPLIERS.get(traffic_tier, 1.0)
    rows: List[Dict[str, Any]] = []

    for idx, code in enumerate(selected_services, start=1):
        meta = AWS_REA_CATALOG.get(code, AWS_REA_CATALOG["EC2"])
        qty = 2 if code in ("EC2", "ECS") else 1
        unit_monthly = round(meta["unit_cost"] * factor, 2)
        monthly_cost = round(unit_monthly * qty, 2)
        annual_cost = round(monthly_cost * 12, 2)
        # Cálculo horario sobre 730 horas/mes
        unit_hourly = round(unit_monthly / 730.0, 4)
        cost_per_hour = round(monthly_cost / 730.0, 4)

        rows.append(
            {
                "service_id": f"aws-{code.lower().replace(' ', '-')}-{idx}",
                "service_name": meta["service_name"],
                "service_code": code,
                "category": meta["category"],
                "instance_type_or_tier": meta["specs"],
                "quantity": qty,
                "hours_per_month": 730,
                "unit": "hour",
                "unit_price": unit_hourly,
                "cost_per_hour": cost_per_hour,
                "monthly_cost": monthly_cost,
                "annual_cost": annual_cost,
            }
        )

    return rows

