# Guía Maestra de Unión Backend (FastAPI) + Frontend (React & TypeScript) — `plan_unio.md`

Este documento concentra **todos los endpoints REST (`/api/v1`)**, contratos JSON, encabezados, manejo de errores del **Gatekeeper Freemium (2 intentos gratuitos por correo)**, **Motor Evaluador REA**, **Autenticación TOTP (RFC 6238)**, **Seguridad IAM (`0-100 pts`)**, **Calculadora FinOps** y **Diagramas Draw.io (`mxgraph.aws4`)**, junto con el código listo para pegar en tu frontend en **React + TypeScript**.

---

## 1. Datos de Conexión Base y Credenciales Demo

| Parámetro | Valor Oficial | Notas para el Frontend |
| :--- | :--- | :--- |
| **URL Base API (Primaria)** | `http://localhost:8080/api/v1` | Puerto primario autodetectado por `analyzerService.ts`. |
| **URL Base API (Secundaria)** | `http://localhost:8000/api/v1` | Puerto alternativo soportado. |
| **Swagger UI (OpenAPI)** | `http://localhost:8080/docs` | Documentación interactiva para probar cada ruta. |
| **Header de Cuota Freemium** | `X-User-Email: <correo_usuario>` | Envía el correo del usuario en cada petición para validar sus **2 intentos gratis**. |
| **Header de Autenticación** | `Authorization: Bearer <access_token>` | Emitido tras verificar el código TOTP de 6 dígitos. |
| **Usuario Arquitecto Demo** | `arquitecto@clouddiagnostix.aws` | Contraseña: `AdminAws2026!` |
| **Secreto MFA TOTP Demo** | `JBSWY3DPEHPK3PXP` | RFC 6238 · 6 dígitos · 30 segundos · SHA1 (`valid_window=1`). |
| **ID Propuesta Sembrada** | `c4e8b215-9c3a-4f2b-8b21-987654321def` | Creada automáticamente al levantar el backend. |

---

## 2. Mapa General de Todos los Endpoints del Backend (`/api/v1`)

| Módulo | Método | Endpoint | Propósito en el Frontend (React + TS) |
| :--- | :---: | :--- | :--- |
| **1. Motor REA** | `GET` | `/api/v1/migration-evaluator/status` | Verifica que el backend y Gemini/REA estén `"online"`. |
| **1. Motor REA** | `POST` | `/api/v1/migration-evaluator/evaluate-zip` | Audita un `.zip` (máx. 50MB) y devuelve 3 escenarios FinOps (aplica Gatekeeper Freemium). |
| **1. Motor REA** | `POST` | `/api/v1/migration-evaluator/evaluate-github` | Audita un repo GitHub y devuelve 3 escenarios FinOps (aplica Gatekeeper Freemium). |
| **2. Suscripción** | `POST` | `/api/v1/subscriptions/register-trial` | Registra un correo con `intentos_usados = 0` y `plan_actual = 'free'`. |
| **2. Suscripción** | `GET` | `/api/v1/subscriptions/status` | Consulta intentos usados (`0/2`), restantes y plan (`'free'` \| `'premium'`). |
| **2. Suscripción** | `POST` | `/api/v1/subscriptions/consume-attempt` | Valida el Gatekeeper y consume `+1` intento o lanza `HTTP 402 LIMIT_REACHED`. |
| **2. Suscripción** | `POST` | `/api/v1/subscriptions/checkout` | Crea la sesión de pago (Stripe / MercadoPago) para subir a `'premium'`. |
| **2. Suscripción** | `POST` | `/api/v1/subscriptions/webhook` | Webhook de pago que actualiza `plan_actual = 'premium'` en la BD. |
| **2. Suscripción** | `POST` | `/api/v1/subscriptions/reset-trial` | Reinicia `intentos_usados = 0` y `plan_actual = 'free'` (útil para demos). |
| **3. Auth & TOTP** | `POST` | `/api/v1/auth/login` | Valida email/password y devuelve `pre_auth_token` + `requires_totp: true`. |
| **3. Auth & TOTP** | `POST` | `/api/v1/auth/verify-totp` | Verifica el código TOTP de 6 dígitos y devuelve el `access_token` JWT. |
| **3. Auth & TOTP** | `GET` | `/api/v1/auth/provisioning-uri` | Devuelve la URI `otpauth://totp/...` para Google Authenticator / Authy. |
| **4. Propuestas** | `GET` | `/api/v1/proposals` | Lista todas las propuestas con su Ficha REA, Seguridad IAM y Costos. |
| **4. Propuestas** | `POST` | `/api/v1/proposals` | Crea una nueva propuesta junto con su evaluación REA, IAM y diagrama AWS4. |
| **4. Propuestas** | `GET` | `/api/v1/proposals/{id}` | Obtiene el detalle completo de una propuesta por su ID. |
| **4. Propuestas** | `PUT` | `/api/v1/proposals/{id}` | Actualiza una propuesta (servicios, región, SLA, presupuesto o controles IAM). |
| **4. Propuestas** | `DELETE` | `/api/v1/proposals/{id}` | Elimina una propuesta y sus registros hijos en cascada. |
| **4. Propuestas** | `GET` | `/api/v1/proposals/{id}/tech-sheet/pdf` | Descarga el PDF A4 binario de la Ficha Técnica REA y Seguridad IAM. |
| **5. Seguridad IAM**| `GET` | `/api/v1/proposals/{id}/security` | Obtiene los 6 controles IAM y el puntaje `0-100 pts` de una propuesta. |
| **5. Seguridad IAM**| `PATCH` | `/api/v1/proposals/{id}/security` | Actualiza los 6 controles IAM y recalcula el puntaje (`Postura Robusta/Aceptable/Crítica`). |
| **5. Seguridad IAM**| `POST` | `/api/v1/security/evaluate` | Calcula en memoria el puntaje IAM (`0-100 pts`) al cambiar switches en la UI. |
| **6. FinOps Costos**| `GET` | `/api/v1/costs/catalog` | Devuelve el catálogo oficial de los **19 servicios AWS** y sus costos base (`730h/mes`). |
| **6. FinOps Costos**| `GET` | `/api/v1/proposals/{id}/costs` | Lista el desglose FinOps por servicio de una propuesta. |
| **6. FinOps Costos**| `POST` | `/api/v1/proposals/{id}/costs/recalculate` | Recalcula y guarda los costos FinOps de una propuesta según tráfico y servicios. |
| **7. Regiones 3D** | `GET` | `/api/v1/regions` | Lista las regiones globales AWS con latitud/longitud para el Globo 3D. |
| **7. Regiones 3D** | `POST` | `/api/v1/proposals/{id}/migrate-region` | Migra la propuesta de región (`sa-east-1` -> `us-east-1`) y guarda bitácora 3D. |
| **8. Draw.io AWS4** | `GET` | `/api/v1/proposals/{id}/diagrams/drawio` | Devuelve el XML `<mxfile>` con contenedores e iconos oficiales `mxgraph.aws4`. |
| **8. Draw.io AWS4** | `PUT` | `/api/v1/proposals/{id}/diagrams/drawio` | Guarda los cambios manuales hechos por el usuario en el editor Draw.io. |
| **8. Draw.io AWS4** | `POST` | `/api/v1/diagrams/drawio/generate` | Genera al vuelo un XML Draw.io `mxgraph.aws4` para cualquier lista de servicios. |

---

## 3. Especificación Detallada de Endpoints y Payloads JSON

### 3.1. Módulo de Suscripción Freemium y Gatekeeper (`/api/v1/subscriptions`)

#### A) Registrar Correo para Prueba Gratuita (`2 intentos gratis`)
- **Endpoint**: `POST /api/v1/subscriptions/register-trial`
- **Request Body (`application/json`)**:
```json
{
  "email": "cliente@empresa.com",
  "full_name": "María Gómez"
}
```
- **Response `200 OK`**:
```json
{
  "user_id": "d960fe7a-baf5-4f4c-8f05-e64194cba590",
  "email": "cliente@empresa.com",
  "intentos_usados": 0,
  "max_intentos": 2,
  "intentos_restantes": 2,
  "plan_actual": "free",
  "can_execute": true
}
```

#### B) Consultar Estado de Intentos y Plan Actual
- **Endpoint**: `GET /api/v1/subscriptions/status?email=cliente@empresa.com` (o enviando header `X-User-Email: cliente@empresa.com`)
- **Response `200 OK`**: Mismo esquema `SubscriptionQuotaStatusResponse`.

#### C) Respuesta de Bloqueo en el 3er Intento (`HTTP 402 Payment Required`)
Cuando el usuario en plan `"free"` ya tiene `intentos_usados == 2` y presiona por **tercera vez** evaluar `.zip`, evaluar GitHub o `/consume-attempt`, el backend bloquea la ejecución antes de llamar a la IA y responde:
- **Status Code**: `402 Payment Required`
- **Response Body**:
```json
{
  "error": "LIMIT_REACHED",
  "message": "Has alcanzado el límite de 2 intentos gratuitos asociados a tu correo. Actualiza al Plan Premium para desbloquear auditorías REA ilimitadas.",
  "email": "cliente@empresa.com",
  "intentos_usados": 2,
  "max_intentos": 2,
  "plan_actual": "free",
  "upgrade_url": "/pricing",
  "detail": {
    "error": "LIMIT_REACHED",
    "message": "Has alcanzado el límite de 2 intentos gratuitos asociados a tu correo. Actualiza al Plan Premium para desbloquear auditorías REA ilimitadas.",
    "email": "cliente@empresa.com",
    "intentos_usados": 2,
    "max_intentos": 2,
    "plan_actual": "free",
    "upgrade_url": "/pricing"
  }
}
```

#### D) Iniciar Checkout de Pago (`Stripe` o `MercadoPago`)
- **Endpoint**: `POST /api/v1/subscriptions/checkout`
- **Request Body**:
```json
{
  "email": "cliente@empresa.com",
  "provider": "stripe",
  "success_url": "http://localhost:5173/aws-cloud/planning?upgraded=true",
  "cancel_url": "http://localhost:5173/pricing?canceled=true"
}
```
- **Response `200 OK`**:
```json
{
  "checkout_url": "http://localhost:5173/aws-cloud/planning?upgraded=true&session_id=chk_stripe_1a2b3c4d&email=cliente@empresa.com&provider=stripe",
  "session_id": "chk_stripe_1a2b3c4d",
  "provider": "stripe",
  "email": "cliente@empresa.com",
  "plan_target": "premium",
  "amount_usd": 29.0,
  "currency": "USD"
}
```

#### E) Webhook de Confirmación de Pago (Actualiza `plan_actual = 'premium'`)
- **Endpoint**: `POST /api/v1/subscriptions/webhook`
- **Request Body**:
```json
{
  "event_type": "checkout.session.completed",
  "email": "cliente@empresa.com",
  "provider": "stripe"
}
```
- **Response `200 OK`**:
```json
{
  "received": true,
  "upgraded": true,
  "email": "cliente@empresa.com",
  "plan_actual": "premium",
  "intentos_usados": 2,
  "message": "Suscripción actualizada exitosamente a 'premium' vía stripe (evento: checkout.session.completed)."
}
```

---

### 3.2. Módulo del Motor Evaluador REA (`/api/v1/migration-evaluator`)

#### A) Estado de Salud del Motor REA
- **Endpoint**: `GET /api/v1/migration-evaluator/status`
- **Response `200 OK`**:
```json
{
  "status": "online",
  "service": "Cloud Diagnostix REA Evaluator",
  "ai_engine": "Gemini 2.5 Flash + REA Heuristic Engine",
  "gemini_active": false
}
```

#### B) Evaluar Archivo `.zip` (`POST /api/v1/migration-evaluator/evaluate-zip`)
- **Headers**: `X-User-Email: cliente@empresa.com` (opcional pero recomendado para contabilizar los 2 intentos gratuitos).
- **Content-Type**: `multipart/form-data`
  - `file`: Archivo `.zip` (máximo 50 MB).
  - `traffic_tier`: `"low"` | `"medium"` | `"high"` | `"enterprise"` (default `"medium"`).
  - `target_region`: `"sa-east-1"`, `"us-east-1"`, etc.
  - `custom_notes`: Texto opcional.
  - `email`: Correo opcional si no se envía en `X-User-Email`.

#### C) Evaluar Repositorio GitHub (`POST /api/v1/migration-evaluator/evaluate-github`)
- **Headers**: `X-User-Email: cliente@empresa.com`
- **Request Body (`application/json`)**:
```json
{
  "repo_url": "https://github.com/tiangolo/fastapi",
  "github_token": "",
  "traffic_tier": "medium",
  "target_region": "sa-east-1",
  "custom_notes": "Priorizar alta disponibilidad Multi-AZ",
  "email": "cliente@empresa.com"
}
```
- **Response `200 OK` (tanto para `evaluate-zip` como `evaluate-github`)**:
```json
{
  "status": "success",
  "origin_detected": "Proyecto auditado (GitHub: fastapi)",
  "detected_configs": ["Dockerfile", "requirements.txt", "docker-compose.yml"],
  "system_analysis": "Evaluación técnica generada por el Motor REA...",
  "architecture_pattern": "Microservicios Contenedorizados Multi-AZ",
  "migration_strategy": "Replatform (Lift, Tinker & Shift)",
  "well_architected_notes": [
    "Fiabilidad: Despliegue Multi-AZ en la región sa-east-1 con balanceo automático en capa 7 (ALB).",
    "Seguridad: Aislamiento en subredes privadas VPC, cifrado TLS 1.3, SSE-KMS en S3 y roles IAM sin credenciales estáticas."
  ],
  "technical_evidence": {
    "languages": ["Python", "SQL"],
    "frameworks": ["FastAPI", "Docker"],
    "databases": ["PostgreSQL (Amazon RDS)", "Redis (Amazon ElastiCache)"],
    "has_docker": true,
    "total_files": 64
  },
  "scenarios": [
    {
      "scenario_type": "Cost-Optimized",
      "summary": "Configuración optimizada en costos para entornos iniciales o pre-producción.",
      "services": [],
      "pricing": { "monthly_total_usd": 149.12, "annual_total_usd": 1789.44, "currency": "USD" }
    },
    {
      "scenario_type": "Recommended-Production",
      "summary": "Balance óptimo recomendado por REA entre alta disponibilidad Multi-AZ, seguridad IAM y costo mensual.",
      "services": [],
      "pricing": { "monthly_total_usd": 428.07, "annual_total_usd": 5136.84, "currency": "USD" }
    },
    {
      "scenario_type": "High-Availability-Enterprise",
      "summary": "Arquitectura de misión crítica con WAF perimetral, caché Redis, KMS y redundancia extendida.",
      "services": [],
      "pricing": { "monthly_total_usd": 980.32, "annual_total_usd": 11763.84, "currency": "USD" }
    }
  ],
  "subscription_quota": {
    "user_id": "d960fe7a-baf5-4f4c-8f05-e64194cba590",
    "email": "cliente@empresa.com",
    "intentos_usados": 1,
    "max_intentos": 2,
    "intentos_restantes": 1,
    "plan_actual": "free",
    "can_execute": true
  }
}
```

---

### 3.3. Módulo de Autenticación y MFA TOTP (`/api/v1/auth`)

#### A) Paso 1 — Login con Correo y Contraseña (`POST /api/v1/auth/login`)
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
  "requires_totp": true,
  "pre_auth_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "b3d7a104-8b2f-4e1a-9a10-123456789abc",
    "email": "arquitecto@clouddiagnostix.aws",
    "full_name": "Jorge Mendoza · Cloud Architect",
    "role": "AWS Solutions Architect",
    "theme_preference": "light",
    "intentos_usados": 0,
    "plan_actual": "free"
  }
}
```

#### B) Paso 2 — Verificar Código TOTP de 6 Dígitos (`POST /api/v1/auth/verify-totp`)
- **Request Body**:
```json
{
  "pre_auth_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "totp_code": "482910"
}
```
- **Response `200 OK`**:
```json
{
  "verified": true,
  "timestamp": "2026-11-01T20:55:00+00:00",
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "expires_in": 28800,
  "user": {
    "id": "b3d7a104-8b2f-4e1a-9a10-123456789abc",
    "email": "arquitecto@clouddiagnostix.aws",
    "full_name": "Jorge Mendoza · Cloud Architect",
    "role": "AWS Solutions Architect",
    "theme_preference": "light",
    "intentos_usados": 0,
    "plan_actual": "free"
  }
}
```

---

### 3.4. Módulo de Propuestas, Seguridad IAM, Migración 3D y Diagramas Draw.io (`/api/v1/proposals`)

#### A) Actualizar los 6 Controles de Seguridad IAM (`PATCH /api/v1/proposals/{id}/security`)
- **Request Body**:
```json
{
  "rootBlocked": true,
  "mfaEnforced": true,
  "ec2Roles": true,
  "tls13": true,
  "s3EncryptionAndVersioning": true,
  "complianceAudits": true
}
```
- **Response `200 OK`**:
```json
{
  "proposal_id": "c4e8b215-9c3a-4f2b-8b21-987654321def",
  "rootBlocked": true,
  "mfaEnforced": true,
  "ec2Roles": true,
  "tls13": true,
  "s3EncryptionAndVersioning": true,
  "complianceAudits": true,
  "security_score": 100,
  "posture_label": "Postura Robusta",
  "recommended_iam_roles": [
    "EC2-MigrationApp-Role (STS Least Privilege)",
    "RDS-PrivateSubnet-AccessRole",
    "S3-KMS-EncryptedBucket-Policy",
    "CloudTrail-SecurityAudit-ReadOnlyRole"
  ]
}
```

#### B) Migrar Propuesta de Región AWS para el Globo 3D (`POST /api/v1/proposals/{id}/migrate-region`)
- **Request Body**:
```json
{
  "to_region": "us-east-1"
}
```
- **Response `200 OK`**:
```json
{
  "status": "migrated",
  "proposal_id": "c4e8b215-9c3a-4f2b-8b21-987654321def",
  "from_region": "sa-east-1",
  "to_region": "us-east-1",
  "migrated_services": ["Route 53", "CloudFront", "ALB", "VPC", "EC2", "RDS", "S3", "IAM", "CloudWatch"],
  "migrated_at": "2026-11-01T20:55:00+00:00"
}
```

#### C) Obtener o Guardar Diagrama XML Draw.io AWS4 (`GET` / `PUT /api/v1/proposals/{id}/diagrams/drawio`)
- **`GET` Response `200 OK`**:
```json
{
  "id": "...",
  "proposal_id": "c4e8b215-9c3a-4f2b-8b21-987654321def",
  "diagram_type": "drawio_aws4",
  "region_snapshot": "sa-east-1",
  "drawio_xml": "<mxfile host=\"CloudDiagnostix-REA-MCP\" ...>...</mxfile>",
  "drawioXml": "<mxfile host=\"CloudDiagnostix-REA-MCP\" ...>...</mxfile>"
}
```
- **`PUT` Request Body**:
```json
{
  "drawio_xml": "<mxfile>...</mxfile>",
  "region_snapshot": "sa-east-1"
}
```

#### D) Descargar Ficha Técnica REA en PDF A4 (`GET /api/v1/proposals/{id}/tech-sheet/pdf`)
- Devuelve un archivo binario `application/pdf` listo para abrir o descargar con `window.open('http://localhost:8080/api/v1/proposals/' + id + '/tech-sheet/pdf', '_blank')`.

---

## 4. Código Completo para Usar en tu Frontend (React + TypeScript)

También tienes todos estos archivos ya creados dentro de la carpeta [`plan_suscricion/src/`](./plan_suscricion/src/). A continuación tienes el cliente unificado listo para copiar en tu proyecto React:

### 4.1. Tipos TypeScript (`src/features/modules/aws-cloud/types/subscription.types.ts`)

```typescript
export type SubscriptionPlanType = 'free' | 'premium';

export interface SubscriptionQuotaStatus {
  user_id?: string;
  email: string;
  intentos_usados: number;
  max_intentos: number | null;
  intentos_restantes: number | null;
  plan_actual: SubscriptionPlanType;
  can_execute?: boolean;
}

export interface LimitReachedErrorDetail {
  error: 'LIMIT_REACHED';
  message: string;
  email: string;
  intentos_usados: number;
  max_intentos: number;
  plan_actual: SubscriptionPlanType;
  upgrade_url: string;
}
```

### 4.2. Cliente Unificado + Interceptor Freemium (`src/features/modules/aws-cloud/services/cloudDiagnostixApi.ts`)

```typescript
import { LimitReachedErrorDetail, SubscriptionQuotaStatus } from '../types/subscription.types';

export const API_BASE_URL = 'http://localhost:8080/api/v1';
export const LIMIT_REACHED_EVENT = 'clouddiagnostix:limit-reached';
export const QUOTA_UPDATED_EVENT = 'clouddiagnostix:quota-updated';
const STORAGE_EMAIL_KEY = 'clouddiagnostix_trial_email';
const STORAGE_TOKEN_KEY = 'clouddiagnostix_access_token';

export function getStoredTrialEmail(): string {
  return localStorage.getItem(STORAGE_EMAIL_KEY) || '';
}

export function setStoredTrialEmail(email: string): void {
  localStorage.setItem(STORAGE_EMAIL_KEY, email.trim().toLowerCase());
}

export function getStoredAccessToken(): string {
  return localStorage.getItem(STORAGE_TOKEN_KEY) || '';
}

export function setStoredAccessToken(token: string): void {
  localStorage.setItem(STORAGE_TOKEN_KEY, token);
}

/**
 * Wrapper centralizado de Fetch que:
 * 1. Inyecta automáticamente `X-User-Email` y `Authorization: Bearer <token>`.
 * 2. Intercepta los errores HTTP 402 y 403 con código `LIMIT_REACHED` cuando
 *    el usuario agota sus 2 intentos gratuitos y dispara el Paywall Modal.
 */
export async function fetchWithSubscriptionGuard(
  endpointOrUrl: string,
  init?: RequestInit
): Promise<Response> {
  const url = endpointOrUrl.startsWith('http')
    ? endpointOrUrl
    : `${API_BASE_URL}${endpointOrUrl.startsWith('/') ? '' : '/'}${endpointOrUrl}`;

  const headers = new Headers(init?.headers || {});
  const email = getStoredTrialEmail();
  const token = getStoredAccessToken();

  if (email && !headers.has('X-User-Email')) {
    headers.set('X-User-Email', email);
  }
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(url, {
    ...init,
    headers,
  });

  if (response.status === 402 || response.status === 403) {
    try {
      const cloned = response.clone();
      const body = await cloned.json();
      const detail: LimitReachedErrorDetail | undefined =
        body?.error === 'LIMIT_REACHED'
          ? body
          : body?.detail?.error === 'LIMIT_REACHED'
          ? body.detail
          : undefined;

      if (detail) {
        window.dispatchEvent(
          new CustomEvent<LimitReachedErrorDetail>(LIMIT_REACHED_EVENT, { detail })
        );
      }
    } catch {
      // Continuar flujo si no es JSON
    }
  } else if (response.ok) {
    window.dispatchEvent(new CustomEvent(QUOTA_UPDATED_EVENT));
  }

  return response;
}

/**
 * Funciones listas para consumir todos los módulos del backend FastAPI
 */
export const cloudDiagnostixApi = {
  // 1. Salud del Motor REA
  async getEvaluatorStatus() {
    const res = await fetch(`${API_BASE_URL}/migration-evaluator/status`);
    return res.json();
  },

  // 2. Evaluar proyecto .zip (con control de 2 intentos gratuitos)
  async evaluateZip(
    file: File,
    trafficTier: string = 'medium',
    targetRegion: string = 'sa-east-1',
    customNotes?: string
  ) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('traffic_tier', trafficTier);
    formData.append('target_region', targetRegion);
    if (customNotes) formData.append('custom_notes', customNotes);
    const email = getStoredTrialEmail();
    if (email) formData.append('email', email);

    const res = await fetchWithSubscriptionGuard('/migration-evaluator/evaluate-zip', {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) throw await res.json();
    return res.json();
  },

  // 3. Evaluar repositorio GitHub (con control de 2 intentos gratuitos)
  async evaluateGithub(
    repoUrl: string,
    trafficTier: string = 'medium',
    targetRegion: string = 'sa-east-1',
    githubToken?: string,
    customNotes?: string
  ) {
    const res = await fetchWithSubscriptionGuard('/migration-evaluator/evaluate-github', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        repo_url: repoUrl,
        github_token: githubToken,
        traffic_tier: trafficTier,
        target_region: targetRegion,
        custom_notes: customNotes,
        email: getStoredTrialEmail() || undefined,
      }),
    });
    if (!res.ok) throw await res.json();
    return res.json();
  },

  // 4. Suscripción Freemium y Pagos
  async registerTrialEmail(email: string): Promise<SubscriptionQuotaStatus> {
    setStoredTrialEmail(email);
    const res = await fetch(`${API_BASE_URL}/subscriptions/register-trial`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    return res.json();
  },

  async getSubscriptionStatus(email?: string): Promise<SubscriptionQuotaStatus> {
    const target = email || getStoredTrialEmail();
    const res = await fetch(
      `${API_BASE_URL}/subscriptions/status?email=${encodeURIComponent(target)}`
    );
    return res.json();
  },

  async createCheckoutSession(email: string, provider: 'stripe' | 'mercadopago' = 'stripe') {
    const res = await fetch(`${API_BASE_URL}/subscriptions/checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, provider }),
    });
    return res.json();
  },

  async confirmWebhookUpgrade(email: string, provider: 'stripe' | 'mercadopago' = 'stripe') {
    const res = await fetch(`${API_BASE_URL}/subscriptions/webhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_type: 'checkout.session.completed',
        email,
        provider,
      }),
    });
    return res.json();
  },

  // 5. Login + TOTP 2FA
  async login(email: string, password: string) {
    const res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) throw await res.json();
    return res.json();
  },

  async verifyTotp(totpCode: string, preAuthToken?: string) {
    const res = await fetch(`${API_BASE_URL}/auth/verify-totp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ totp_code: totpCode, pre_auth_token: preAuthToken }),
    });
    if (!res.ok) throw await res.json();
    const data = await res.json();
    if (data.access_token) setStoredAccessToken(data.access_token);
    if (data.user?.email) setStoredTrialEmail(data.user.email);
    return data;
  },

  // 6. Propuestas Cloud, Seguridad IAM, Regiones y Diagramas Draw.io AWS4
  async listProposals() {
    const res = await fetchWithSubscriptionGuard('/proposals');
    return res.json();
  },

  async createProposal(payload: Record<string, unknown>) {
    const res = await fetchWithSubscriptionGuard('/proposals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return res.json();
  },

  async updateSecurityControls(proposalId: string, controls: Record<string, boolean>) {
    const res = await fetchWithSubscriptionGuard(`/proposals/${proposalId}/security`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(controls),
    });
    return res.json();
  },

  async migrateRegion(proposalId: string, toRegion: string) {
    const res = await fetchWithSubscriptionGuard(`/proposals/${proposalId}/migrate-region`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to_region: toRegion }),
    });
    return res.json();
  },

  async getDrawioDiagram(proposalId: string) {
    const res = await fetchWithSubscriptionGuard(`/proposals/${proposalId}/diagrams/drawio`);
    return res.json();
  },

  async saveDrawioDiagram(proposalId: string, drawioXml: string, regionSnapshot?: string) {
    const res = await fetchWithSubscriptionGuard(`/proposals/${proposalId}/diagrams/drawio`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ drawio_xml: drawioXml, region_snapshot: regionSnapshot }),
    });
    return res.json();
  },

  getTechSheetPdfUrl(proposalId: string): string {
    return `${API_BASE_URL}/proposals/${proposalId}/tech-sheet/pdf`;
  },
};
```

---

## 5. Cómo Conectar el Modal de Suscripción en tu `App.tsx` o `AwsPlanning.tsx`

1. Copia los 4 archivos de [`plan_suscricion/src/`](./plan_suscricion/src/) dentro de `src/features/modules/aws-cloud/` en tu proyecto React:
   - `types/subscription.types.ts`
   - `services/subscriptionInterceptor.ts`
   - `context/SubscriptionContext.tsx`
   - `components/AwsSubscriptionPaywallModal.tsx`
2. Envuelve tu módulo o aplicación con `<SubscriptionProvider>` y coloca `<AwsSubscriptionPaywallModal />`:

```tsx
import React from 'react';
import { SubscriptionProvider } from './features/modules/aws-cloud/context/SubscriptionContext';
import { AwsSubscriptionPaywallModal } from './features/modules/aws-cloud/components/AwsSubscriptionPaywallModal';
import { AwsPlanning } from './features/modules/aws-cloud/pages/AwsPlanning';

export function AwsCloudSuiteModule() {
  return (
    <SubscriptionProvider>
      <AwsPlanning />
      {/* Se abre automáticamente cuando el backend devuelve HTTP 402 LIMIT_REACHED en el 3er intento */}
      <AwsSubscriptionPaywallModal />
    </SubscriptionProvider>
  );
}
```

