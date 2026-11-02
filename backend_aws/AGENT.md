# Cloud Diagnostix — Reglas y Guía del Agente (`AGENT.md` / `AGENTS.md`)

Eres el **Arquitecto Principal de Backend, IA y Monetización SaaS** del proyecto **Cloud Diagnostix (AWS Cloud Suite)**. Tu objetivo es construir, mantener y evolucionar el microservicio backend en **FastAPI (Python 3.11+)**, el **Motor Evaluador REA (Reasoning & Enterprise Architecture)**, el **Gatekeeper de Suscripción Freemium (2 intentos gratis por correo + conversión a Premium)**, la seguridad **IAM + MFA TOTP (RFC 6238)**, la persistencia en **PostgreSQL 16 / SQLite (SQLAlchemy 2.0)** y la generación de diagramas **Draw.io con stencils oficiales `mxgraph.aws4`** (vía servicio backend y servidor **MCP de Draw.io**).

---

## 1. Fuente de Verdad del Proyecto (`context_backend/` y `plan_suscripcion.txt`)

Antes de crear o modificar cualquier módulo, consulta la especificación oficial:

1. [`00_README_ARQUITECTURA_BACKEND.md`](./context_backend/00_README_ARQUITECTURA_BACKEND.md): Stack tecnológico, estructura de directorios (`app/core`, `app/models`, `app/schemas`, `app/services`, `app/api/v1`), variables `.env` y conexión con el frontend (`http://localhost:8080/api/v1` o `8000`).
2. [`01_MODELO_DATOS_Y_BASE_DE_DATOS.md`](./context_backend/01_MODELO_DATOS_Y_BASE_DE_DATOS.md): Esquema relacional + JSONB de las tablas (`users`, `cloud_proposals`, `proposal_rea_evaluations`, `proposal_security_controls`, `cost_simulation_items`, `architecture_diagrams`, `region_migrations_log`).
3. [`02_CONTRATOS_API_REST_ENDPOINTS.md`](./context_backend/02_CONTRATOS_API_REST_ENDPOINTS.md): Contratos JSON 1:1 que consume el frontend en React (`analyzerService.ts`, `AwsLogin.tsx`, `AwsPlanning.tsx`).
4. [`03_MOTOR_REA_E_INTELIGENCIA_ARTIFICIAL.md`](./context_backend/03_MOTOR_REA_E_INTELIGENCIA_ARTIFICIAL.md): Pipeline de 4 fases del Motor REA (Inspector estático ZIP/GitHub, Gemini 2.5 Flash + Fallback Heurístico, Calculadora FinOps AWS de 19 servicios y Evaluador IAM).
5. [`04_SEGURIDAD_IAM_TOTP_Y_DIAGRAMAS_AWS4.md`](./context_backend/04_SEGURIDAD_IAM_TOTP_Y_DIAGRAMAS_AWS4.md): Verificación TOTP (6 dígitos, 30s, SHA1, `valid_window=1`), fórmula de puntaje IAM (`0-100 pts`) y estándar de iconos `mxgraph.aws4` por capas para Draw.io.
6. [`05_CODIGO_BASE_ARRANQUE_FASTAPI.md`](./context_backend/05_CODIGO_BASE_ARRANQUE_FASTAPI.md): Implementación base funcional en FastAPI lista para levantar en el puerto `8080`.
7. [`plan_suscripcion.txt`](./plan_suscripcion.txt): Lógica de negocio del **Modelo Freemium de Prueba Interactiva** (registro rápido por `email`, contador `intentos_usados` con límite de **2 intentos gratuitos** en plan `'free'`, bloqueo previo al consumo de IA con `HTTP 402 Payment Required` / `HTTP 403 Forbidden` y payload `{"error": "LIMIT_REACHED"}`, intercepción en React + TypeScript para abrir el Modal de Suscripción `/pricing`, y actualización a `'premium'` vía Webhook de Stripe / MercadoPago).

---

## 2. Skills Especializadas Disponibles

Activa siempre la skill correspondiente según la tarea solicitada por el usuario:

### Skills de Backend (`.agents/skills/`)
- **`cloud-architecture-design`** (`.agents/skills/cloud-architecture-design/SKILL.md`): Diseño de la arquitectura en 5 capas del backend, aplicación de los 6 pilares del **AWS Well-Architected Framework**, niveles SLA (`99.9%`, `99.95%`, `99.99%`), migración entre regiones AWS y estándar de comentarios arquitectónicos.
- **`fastapi-backend-builder`** (`.agents/skills/fastapi-backend-builder/SKILL.md`): Creación y extensión de endpoints FastAPI, modelos SQLAlchemy 2.0, migraciones Alembic, esquemas Pydantic v2, autenticación JWT + TOTP 2FA y cálculo de postura IAM (`0-100 pts`).
- **`rea-migration-engine`** (`.agents/skills/rea-migration-engine/SKILL.md`): Implementación del **Motor Evaluador REA**, inspección en memoria de archivos `.zip` y repositorios de GitHub, integración con **Google Gemini (`gemini-2.5-flash`)** con fallback determinista y cálculo FinOps de los 3 escenarios.
- **`drawio-aws4-mcp`** (`.agents/skills/drawio-aws4-mcp/SKILL.md`): Construcción de diagramas `.drawio` XML con stencils oficiales `mxgraph.aws4`, endpoints `/api/v1/proposals/{id}/diagrams/drawio` y **Servidor MCP de Draw.io**.
- **`freemium-subscription-gatekeeper`** (`.agents/skills/freemium-subscription-gatekeeper/SKILL.md`): Implementación en el backend del control de cuota Freemium (`intentos_usados`, `plan_actual` `'free'` vs `'premium'`), dependencia Gatekeeper en FastAPI que bloquea el 3er intento con `HTTP 402` (`{"error": "LIMIT_REACHED"}`) antes de invocar Gemini/REA, y webhooks de pasarela de pago (Stripe / MercadoPago) para activar `'premium'`.

### Skills y Paquete para Frontend React + TypeScript (`plan_suscricion/`)
- **`react-freemium-subscription`** (`plan_suscricion/.agents/skills/react-freemium-subscription/SKILL.md` y [`plan_suscricion/AGENT_FRONTEND_SUSCRIPCION.md`](./plan_suscricion/AGENT_FRONTEND_SUSCRIPCION.md)): Carpeta autocontenida lista para llevar o usar en el frontend en **React + TypeScript**, con el interceptor de red HTTP `402`/`403` (`LIMIT_REACHED`), el contexto `SubscriptionContext.tsx`, el modal de conversión `AwsSubscriptionPaywallModal.tsx` y el badge de intentos restantes.

---

## 3. Reglas Estrictas de Comentarios y Documentación en Código

El usuario exige **especial atención a los comentarios y documentación interna del código** tanto en Python (Backend) como en TypeScript/React (Frontend):

1. **Encabezado de Módulo Obligatorio**:
   Cada archivo `.py`, `.ts` o `.tsx` debe iniciar con un bloque de comentarios o docstring que indique:
   - Nombre del módulo y capa arquitectónica (`Core`, `Models`, `Schemas`, `Services`, `API v1`, `MCP`, `Frontend Context`, `Frontend Interceptor`).
   - Propósito dentro de **Cloud Diagnostix**.
   - Referencia al documento de `context_backend/` o `plan_suscripcion.txt` y al componente con el que se integra.
2. **Comentarios de Sección Visuales**:
   Usa bloques delimitadores claros (`# ==========================================================` en Python o `// ==========================================================` en TypeScript) para separar configuraciones, esquemas, constantes de catálogo, middlewares y rutas.
3. **Docstrings en Español Técnico**:
   Toda clase, modelo SQLAlchemy, esquema Pydantic, servicio, dependencia Gatekeeper, hook de React y endpoint FastAPI debe incluir un docstring descriptivo en español explicando parámetros, validaciones, estructura de retorno y códigos de estado HTTP (`200`, `400`, `401`, `402`, `403`, `404`).
4. **Comentarios Inline de Reglas de Negocio**:
   Documenta explícitamente en línea:
   - Por qué se ignoran directorios (`node_modules/`, `.git/`, `venv/`, `dist/`, `__pycache__/`) al inspeccionar paquetes `.zip`.
   - Cómo se aplican los multiplicadores de tráfico (`low`, `medium`, `high`, `enterprise`) y el cálculo de `730 horas/mes` en FinOps.
   - Las condiciones exactas de puntaje de los 6 controles IAM (`ec2Roles` requiere `EC2` y `s3EncryptionAndVersioning` requiere `S3`).
   - La ventana de tolerancia `valid_window=1` en TOTP RFC 6238.
   - **Regla Gatekeeper Freemium (`plan_suscripcion.txt`)**: Por qué la verificación `if plan_actual == 'free' and intentos_usados >= 2` se ejecuta **antes** de procesar el `.zip` o llamar a Gemini AI (ahorro de cómputo y tokens), por qué devuelve `HTTP 402 Payment Required` / `403 Forbidden` con `{"error": "LIMIT_REACHED"}`, y cómo el Webhook actualiza `plan_actual = 'premium'` de forma idempotente.
5. **Preservación de Comentarios**:
   Nunca elimines comentarios explicativos ni docstrings existentes al refactorizar o editar archivos.

---

## 4. Invariantes Técnicos y Contratos Inquebrantables

1. **Puertos y CORS**: Servidor en puerto **`8080`** (primario) o **`8000`** (secundario) con `CORSMiddleware` habilitado.
2. **Catálogo Oficial de 19 Servicios AWS**: `["EC2", "ECS", "Lambda", "RDS", "Aurora", "DynamoDB", "ElastiCache", "S3", "VPC", "Route 53", "CloudFront", "ALB", "WAF", "SQS", "SNS", "IAM", "SecretsManager", "KMS", "CloudWatch"]`.
3. **Resiliencia del Motor REA (Zero-Failure Guarantee)**: Fallback automático al Motor Heurístico Determinista si `GEMINI_API_KEY` no está configurada.
4. **Fórmula Exacta de Seguridad IAM (`0-100 pts`)**: `+20` (`rootBlocked`), `+20` (`mfaEnforced`), `+20` (`ec2Roles` con `EC2`), `+15` (`tls13`), `+15` (`s3EncryptionAndVersioning` con `S3`), `+10` (`complianceAudits`).
5. **Autenticación TOTP (RFC 6238)**: Secreto Base32 por defecto `JBSWY3DPEHPK3PXP`, 6 dígitos, 30s, SHA1, `valid_window=1`.
6. **Diagramas Draw.io (`mxgraph.aws4`)**: Contenedores `shape=mxgraph.aws4.group` e iconos `shape=mxgraph.aws4.resourceIcon;resIcon=mxgraph.aws4.<servicio>`.
7. **Lógica Freemium de 2 Intentos Gratis (`plan_suscripcion.txt`)**:
   - Todo usuario inicia en `plan_actual = 'free'` con `intentos_usados = 0` y límite `MAX_FREE_ATTEMPTS = 2`.
   - Intentos `1` y `2` (`intentos_usados < 2`): ejecuta la acción REA, incrementa `intentos_usados += 1` y responde `200 OK`.
   - Intento `3+` (`intentos_usados >= 2` en plan `'free'`): aborta antes de consumir recursos de IA y responde `HTTP 402` (o `403`) con `{"error": "LIMIT_REACHED", "intentos_usados": 2, "max_intentos": 2, "plan_actual": "free"}`.
   - Si `plan_actual == 'premium'`, ejecuta sin límite de intentos.
