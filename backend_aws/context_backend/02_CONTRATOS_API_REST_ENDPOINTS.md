# 02. Contratos de API REST y Endpoints (`/api/v1`)

Este documento especifica todos los endpoints HTTP, encabezados, payloads de entrada y contratos JSON de salida que debe exponer el backend para integrarse 1:1 con el frontend de **Cloud Diagnostix**.

---

## 1. Módulo de Salud y Evaluador de Migración REA (`/api/v1/migration-evaluator`)

Estos endpoints ya están conectados en el archivo del frontend [`src/features/modules/aws-cloud/services/analyzerService.ts`](../src/features/modules/aws-cloud/services/analyzerService.ts).

### 1.1. `GET /api/v1/migration-evaluator/status`
Verifica que el backend y el motor de IA (Gemini + REA) estén activos.

- **Response `200 OK`**:
```json
{
  "status": "online",
  "service": "Cloud Diagnostix REA Evaluator",
  "ai_engine": "Gemini 2.5 Flash + REA Heuristic Engine",
  "gemini_active": true
}
```

---

### 1.2. `POST /api/v1/migration-evaluator/evaluate-zip`
Recibe un paquete `.zip` con el código fuente de un proyecto y devuelve la evaluación arquitectónica completa de **REA** con 3 escenarios (`Cost-Optimized`, `Recommended-Production`, `High-Availability-Enterprise`).

- **Content-Type**: `multipart/form-data`
- **Campos FormData**:
  - `file` (`File`, obligatorio): Archivo `.zip` (máx. 50 MB).
  - `traffic_tier` (`string`, opcional): `"low"` | `"medium"` | `"high"` | `"enterprise"` (default `"medium"`).
  - `target_region` (`string`, opcional): Ej. `"sa-east-1"`, `"us-east-1"`.
  - `custom_notes` (`string`, opcional): Notas adicionales de arquitectura.

- **Response `200 OK` (`EnterpriseEvaluationResponse`)**:
```json
{
  "status": "success",
  "origin_detected": "Proyecto Fullstack React + FastAPI (Docker / Render)",
  "detected_configs": ["package.json", "requirements.txt", "Dockerfile", "docker-compose.yml"],
  "system_analysis": "Evaluación técnica generada por REA. Se detectó una arquitectura desacoplada con frontend SPA en React y API backend en Python/FastAPI con persistencia PostgreSQL.",
  "architecture_pattern": "Arquitectura Web Empresarial Multi-Capa (3-Tier High Availability)",
  "migration_strategy": "Replatform (Lift, Tinker & Shift)",
  "well_architected_notes": [
    "Fiabilidad: Despliegue distribuido en múltiples Zonas de Disponibilidad (sa-east-1) con balanceo ALB.",
    "Seguridad: Aislamiento de base de datos RDS en subred privada VPC, TLS 1.3 y roles IAM con mínimo privilegio.",
    "Optimización de Costos: Instancias t3.large con posibilidad de Compute Savings Plans (hasta 32% de ahorro).",
    "Excelencia Operativa: Telemetría centralizada y alarmas proactivas con Amazon CloudWatch."
  ],
  "technical_evidence": {
    "languages": ["TypeScript", "Python", "SQL"],
    "frameworks": ["React 19", "FastAPI"],
    "databases": ["PostgreSQL"],
    "has_docker": true,
    "total_files": 48
  },
  "scenarios": [
    {
      "scenario_type": "Cost-Optimized",
      "summary": "Configuración optimizada en costos para cargas iniciales o pre-producción.",
      "services": [
        {
          "service_name": "Amazon Elastic Compute Cloud (EC2)",
          "service_code": "EC2",
          "category": "Cómputo",
          "role": "Capa de Cómputo de Aplicación",
          "specs": "1x t3.medium (2 vCPU, 4 GB RAM)",
          "quantity": 1,
          "estimated_unit_cost_usd": 30.37,
          "total_monthly_usd": 30.37,
          "reason": "Instancia única balanceada para tráfico moderado."
        }
      ],
      "pricing": {
        "monthly_total_usd": 211.45,
        "annual_total_usd": 2537.40,
        "currency": "USD"
      }
    },
    {
      "scenario_type": "Recommended-Production",
      "summary": "Balance óptimo recomendado por REA entre alta disponibilidad Multi-AZ, rendimiento y costo mensual.",
      "services": [
        {
          "service_name": "Amazon Route 53 (DNS Cloud)",
          "service_code": "Route 53",
          "category": "Redes y CDN",
          "role": "Resolución DNS Global y Health Checks",
          "specs": "Hosted Zone Pública + Enrutamiento con chequeo de salud HTTPS",
          "quantity": 1,
          "estimated_unit_cost_usd": 0.50,
          "total_monthly_usd": 0.50,
          "reason": "Gestiona el dominio corporativo con baja latencia y failover automático."
        },
        {
          "service_name": "Amazon CloudFront (CDN)",
          "service_code": "CloudFront",
          "category": "Redes y CDN",
          "role": "Red de Entrega de Contenido (CDN) y Caché Edge",
          "specs": "Distribución Global Edge (500 GB transferencia) + TLS 1.3",
          "quantity": 1,
          "estimated_unit_cost_usd": 42.50,
          "total_monthly_usd": 42.50,
          "reason": "Acelera la entrega del frontend React y protege el origen."
        },
        {
          "service_name": "Elastic Load Balancing (ALB)",
          "service_code": "ALB",
          "category": "Redes y CDN",
          "role": "Balanceo de Carga de Aplicación (Capa 7)",
          "specs": "Application Load Balancer Multi-AZ con terminación SSL/TLS",
          "quantity": 1,
          "estimated_unit_cost_usd": 16.43,
          "total_monthly_usd": 16.43,
          "reason": "Distribuye tráfico HTTPS entre instancias EC2 en múltiples AZs."
        },
        {
          "service_name": "Amazon Virtual Private Cloud (VPC)",
          "service_code": "VPC",
          "category": "Redes y CDN",
          "role": "Aislamiento Lógico de Red Cloud",
          "specs": "VPC /16 con Subredes Públicas/Privadas, IGW y Security Groups",
          "quantity": 1,
          "estimated_unit_cost_usd": 0.00,
          "total_monthly_usd": 0.00,
          "reason": "Segmenta la red perimetral y aísla la capa de datos."
        },
        {
          "service_name": "Amazon Elastic Compute Cloud (EC2)",
          "service_code": "EC2",
          "category": "Cómputo",
          "role": "Capa de Cómputo de Aplicación",
          "specs": "2x t3.large (2 vCPU, 8 GB RAM) · Auto Scaling Multi-AZ",
          "quantity": 2,
          "estimated_unit_cost_usd": 60.74,
          "total_monthly_usd": 121.48,
          "reason": "Dimensionado por REA para soportar la concurrencia estimada con redundancia."
        },
        {
          "service_name": "Amazon Relational Database Service (RDS)",
          "service_code": "RDS",
          "category": "Base de Datos",
          "role": "Persistencia Transaccional Relacional",
          "specs": "db.t3.large PostgreSQL · Despliegue Multi-AZ con failover automático",
          "quantity": 1,
          "estimated_unit_cost_usd": 127.75,
          "total_monthly_usd": 127.75,
          "reason": "Garantiza integridad ACID y backups automáticos en subred privada."
        },
        {
          "service_name": "Amazon Simple Storage Service (S3)",
          "service_code": "S3",
          "category": "Almacenamiento",
          "role": "Almacenamiento de Objetos y Activos Estáticos",
          "specs": "S3 Standard (100 GB) · Versionado y cifrado SSE-KMS activo",
          "quantity": 1,
          "estimated_unit_cost_usd": 2.30,
          "total_monthly_usd": 2.30,
          "reason": "Almacena archivos estáticos, reportes y respaldos con 11 nueves de durabilidad."
        },
        {
          "service_name": "AWS Identity and Access Management (IAM)",
          "service_code": "IAM",
          "category": "Seguridad e Identidad",
          "role": "Gobierno de Identidad y Mínimo Privilegio",
          "specs": "Roles IAM para EC2, Políticas RBAC y MFA obligatorio",
          "quantity": 1,
          "estimated_unit_cost_usd": 0.00,
          "total_monthly_usd": 0.00,
          "reason": "Elimina credenciales estáticas en código mediante roles temporales STS."
        }
      ],
      "pricing": {
        "monthly_total_usd": 310.95,
        "annual_total_usd": 3731.40,
        "currency": "USD"
      }
    },
    {
      "scenario_type": "High-Availability-Enterprise",
      "summary": "Arquitectura de misión crítica con redundancia extendida, caché en memoria y WAF perimetral.",
      "services": [],
      "pricing": {
        "monthly_total_usd": 513.07,
        "annual_total_usd": 6156.84,
        "currency": "USD"
      }
    }
  ]
}
```

---

### 1.3. `POST /api/v1/migration-evaluator/evaluate-github`
Inspecciona un repositorio de GitHub y genera la misma estructura `EnterpriseEvaluationResponse`.

- **Content-Type**: `application/json`
- **Request Body**:
```json
{
  "repo_url": "https://github.com/tiangolo/fastapi",
  "github_token": "ghp_opcional...",
  "traffic_tier": "medium",
  "target_region": "sa-east-1",
  "custom_notes": "Priorizar alta disponibilidad Multi-AZ"
}
```
- **Response `200 OK`**: Mismo contrato `EnterpriseEvaluationResponse` que `evaluate-zip`.

---

## 2. Módulo de Autenticación y código de correo (`/api/v1/auth`)

Soporta el login con código temporal de 6 dígitos enviado por correo, implementado en [`AwsLogin.tsx`](../src/features/modules/aws-cloud/pages/AwsLogin.tsx).

### 2.1. `POST /api/v1/auth/login`
Valida correo y contraseña, envía un código al correo y devuelve un `pre_auth_token` temporal.

- **Request Body**:
```json
{
  "email": "arquitecto@clouddiagnostix.aws",
  "password": "AdminAws2026!"
}
```
- **Response `200 OK`**:
```json
{
  "requires_email_code": true,
  "pre_auth_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "email": "arquitecto@clouddiagnostix.aws",
    "full_name": "Jorge Mendoza · Cloud Architect",
    "role": "AWS Solutions Architect",
    "theme_preference": "light"
  }
}
```

### 2.2. `POST /api/v1/auth/verify-email-code`
Verifica el código de 6 dígitos enviado al correo y emite el JWT definitivo.

- **Request Body**:
```json
{
  "pre_auth_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "email_code": "482910"
}
```
- **Response `200 OK`**:
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "expires_in": 28800,
  "user": {
    "id": "b3d7a104-8b2f-4e1a-9a10-123456789abc",
    "email": "arquitecto@clouddiagnostix.aws",
    "full_name": "Jorge Mendoza · Cloud Architect",
    "role": "AWS Solutions Architect",
    "theme_preference": "light"
  }
}
```

---

## 3. Módulo de Propuestas Cloud, Seguridad IAM y Ficha Técnica (`/api/v1/proposals`)

| Método | Ruta | Descripción |
| :--- | :--- | :--- |
| `GET` | `/api/v1/proposals` | Lista todas las propuestas registradas con su `reaEvaluation` y `securityControls`. |
| `POST` | `/api/v1/proposals` | Crea una nueva propuesta cloud junto con su evaluación REA y controles IAM. |
| `GET` | `/api/v1/proposals/{id}` | Obtiene el detalle completo de una propuesta por ID. |
| `PUT` | `/api/v1/proposals/{id}` | Actualiza una propuesta (servicios, SLA, región, presupuesto o controles IAM). |
| `DELETE` | `/api/v1/proposals/{id}` | Elimina una propuesta registrada. |
| `POST` | `/api/v1/proposals/{id}/migrate-region` | Migra la propuesta a una nueva región AWS (ej. `sa-east-1` -> `us-east-1`) y registra la bitácora para la animación del globo 3D. |
| `PATCH` | `/api/v1/proposals/{id}/security` | Actualiza los 6 controles de seguridad IAM de la propuesta y recalcula el puntaje `0-100`. |
| `GET` | `/api/v1/proposals/{id}/tech-sheet/pdf` | Genera y descarga el archivo PDF A4 de la Ficha Técnica REA y Seguridad IAM. |
| `GET` | `/api/v1/proposals/{id}/diagrams/drawio` | Devuelve el XML de Draw.io con iconos oficiales `mxgraph.aws4` de la arquitectura evaluada. |
| `PUT` | `/api/v1/proposals/{id}/diagrams/drawio` | Guarda cambios manuales hechos por el usuario en el editor Draw.io. |

