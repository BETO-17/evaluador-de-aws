# Catálogo Oficial de 19 Servicios AWS y Prompt Gemini 2.5 Flash — Motor REA

---

## 1. System Prompt Estructurado para Google Gemini (`gemini-2.5-flash`)

```text
Eres REA (Reasoning & Enterprise Architecture Agent), el motor experto de arquitectura AWS de Cloud Diagnostix.
Analiza la evidencia técnica del proyecto adjunto y diseña una arquitectura en Amazon Web Services para la región {target_region} y el nivel de tráfico {traffic_tier}.

Reglas obligatorias:
1. Usa exclusivamente códigos oficiales de servicios del catálogo:
   ["EC2", "ECS", "Lambda", "RDS", "Aurora", "DynamoDB", "ElastiCache", "S3", "VPC", "Route 53", "CloudFront", "ALB", "WAF", "SQS", "SNS", "IAM", "SecretsManager", "KMS", "CloudWatch"].
2. Devuelve siempre 3 escenarios en el arreglo `scenarios`:
   - "Cost-Optimized": Instancias t3.medium / Serverless básico para pre-producción o MVP.
   - "Recommended-Production": Despliegue Multi-AZ balanceado (t3.large, RDS Multi-AZ, ALB, CloudFront, S3, VPC, IAM).
   - "High-Availability-Enterprise": Arquitectura de misión crítica (m6i.large / ECS Fargate, Aurora Multi-AZ, ElastiCache Redis, WAF, KMS, SecretsManager, CloudWatch).
3. Incluye siempre justificaciones técnicas (`reason`) alineadas con los 6 pilares del AWS Well-Architected Framework.
```

---

## 2. Tabla Oficial de los 19 Servicios y Precios Base (`AWS_REA_CATALOG`)

| `service_code` | Nombre Oficial | Categoría | Especificación Base (`Recommended-Production`) | Costo Unitario Mensual (USD) |
| :--- | :--- | :--- | :--- | :---: |
| **`Route 53`** | Amazon Route 53 (DNS Cloud) | Redes y CDN | Hosted Zone Pública + Health Checks HTTPS | `$0.50` |
| **`CloudFront`** | Amazon CloudFront (CDN) | Redes y CDN | Distribución Global Edge (500 GB) + TLS 1.3 | `$42.50` |
| **`WAF`** | AWS WAF (Web Application Firewall) | Seguridad e Identidad | Web ACL + Reglas Administradas Anti-SQLi/XSS | `$15.00` |
| **`ALB`** | Elastic Load Balancing (ALB) | Redes y CDN | Application Load Balancer Multi-AZ SSL/TLS | `$16.43` |
| **`VPC`** | Amazon Virtual Private Cloud (VPC) | Redes y CDN | VPC `/16` con Subredes Públicas/Privadas y SG | `$0.00` |
| **`EC2`** | Amazon Elastic Compute Cloud (EC2) | Cómputo | `t3.large` (2 vCPU, 8 GB RAM) · Auto Scaling Multi-AZ | `$60.74` |
| **`ECS`** | Amazon ECS Fargate | Cómputo | Tasks Fargate (1 vCPU, 2 GB RAM) Multi-AZ | `$33.58` |
| **`Lambda`** | AWS Lambda | Serverless | Funciones 512 MB RAM · 1M invocaciones/mes | `$8.50` |
| **`RDS`** | Amazon RDS (PostgreSQL / MySQL) | Base de Datos | `db.t3.large` Multi-AZ con failover automático | `$127.75` |
| **`Aurora`** | Amazon Aurora Serverless v2 | Base de Datos | Cluster Aurora PostgreSQL Multi-AZ (2-8 ACU) | `$175.20` |
| **`DynamoDB`** | Amazon DynamoDB | Base de Datos | On-Demand + Backups Point-in-Time (PITR) | `$25.00` |
| **`ElastiCache`** | Amazon ElastiCache (Redis) | Base de Datos | `cache.t4g.medium` Redis Multi-AZ | `$37.96` |
| **`S3`** | Amazon Simple Storage Service (S3) | Almacenamiento | S3 Standard (100 GB) + Versionado y SSE-KMS | `$2.30` |
| **`SQS`** | Amazon Simple Queue Service (SQS) | Serverless | Cola FIFO/Standard Desacoplada | `$4.00` |
| **`SNS`** | Amazon Simple Notification Service | Serverless | Tópicos Pub/Sub de Eventos Transaccionales | `$3.50` |
| **`IAM`** | AWS Identity and Access Management | Seguridad e Identidad | Roles IAM STS, Políticas RBAC y MFA obligatorio | `$0.00` |
| **`SecretsManager`** | AWS Secrets Manager | Seguridad e Identidad | Rotación automática de secretos de BD y API | `$4.00` |
| **`KMS`** | AWS Key Management Service (KMS) | Seguridad e Identidad | Claves Maestras CMK con rotación anual | `$3.00` |
| **`CloudWatch`** | Amazon CloudWatch | Monitoreo y Gestión | Dashboards de telemetría, Logs y Alarmas CPU | `$12.00` |

