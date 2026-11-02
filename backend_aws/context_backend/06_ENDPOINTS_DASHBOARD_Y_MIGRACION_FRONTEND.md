# Contrato de integración API v1 — Dashboard Cloud Diagnostix

Documento de referencia para conectar el frontend `separacion_aws` con el backend `backend_aws` y retirar los datos simulados del dashboard.

## 1. Alcance y fuente de verdad

Este contrato fue elaborado revisando:

- `app/api/v1/endpoints/`
- `app/schemas/`
- `app/models/`
- `app/services/`
- `app/main.py` y `app/api/v1/router.py`
- `schema.sql`, `README.md` y `plan_suscripcion.txt`
- `separacion_aws/src/features/modules/aws-cloud/`

El archivo de suscripción existente en el backend se llama `plan_suscripcion.txt` (no `plan_suscripcion.md`). La regla vigente es: **Plan Free = 2 auditorías REA por correo; Plan Premium = auditorías sin límite**.

## 2. URL base y configuración del frontend

En desarrollo:

```env
VITE_API_BASE_URL=http://localhost:8080/api/v1
```

El frontend debe usar una sola instancia de cliente HTTP. Si no existe `VITE_API_BASE_URL`, el código actual intenta detectar los puertos `8080` y `8000` mediante `analyzerService.ts`.

```ts
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api/v1';
```

Headers para las peticiones autenticadas:

```http
Authorization: Bearer <access_token>
X-User-Email: usuario@empresa.com
Content-Type: application/json
```

`X-User-Email` se utiliza actualmente para resolver la cuota Freemium. Cuando el backend tenga autorización por usuario habilitada, el frontend debe conservar el JWT como fuente principal y dejar `X-User-Email` como dato auxiliar o eliminarlo.

## 3. Resumen completo de endpoints existentes

Todas las rutas, excepto `/`, están bajo `/api/v1`.

| Dominio | Método | Ruta | Uso en dashboard |
|---|---:|---|---|
| Salud | GET | `/migration-evaluator/status` | Estado del motor REA |
| REA | POST | `/migration-evaluator/evaluate-zip` | Analizar ZIP |
| REA | POST | `/migration-evaluator/evaluate-github` | Analizar repositorio GitHub |
| Auth | POST | `/auth/login` | Credenciales, paso 1 |
| Auth | POST | `/auth/register` | Crear cuenta Free y enviar código de correo |
| Auth | POST | `/auth/verify-email-code` | Verificar código de 6 dígitos enviado por correo |
| Auth | POST | `/auth/password-recovery/request` | Solicitar enlace temporal por correo |
| Auth | GET | `/auth/password-recovery/validate` | Validar enlace temporal |
| Auth | POST | `/auth/password-recovery/confirm` | Cambiar contraseña con token y código de correo |
| Suscripción | POST | `/subscriptions/register-trial` | Registrar correo Free |
| Suscripción | GET | `/subscriptions/status` | Cuota y plan actual |
| Suscripción | POST | `/subscriptions/consume-attempt` | Consumir una auditoría manualmente |
| Suscripción | POST | `/subscriptions/checkout` | Crear checkout Premium |
| Suscripción | POST | `/subscriptions/webhook` | Confirmar pago y pasar a Premium |
| Suscripción | POST | `/subscriptions/reset-trial` | Reinicio de prueba; solo testing |
| Propuestas | GET | `/proposals` | Listar propuestas |
| Propuestas | POST | `/proposals` | Crear propuesta completa |
| Propuestas | GET | `/proposals/{proposal_id}` | Cargar dashboard por propuesta |
| Propuestas | PUT | `/proposals/{proposal_id}` | Guardar datos de planificación |
| Propuestas | DELETE | `/proposals/{proposal_id}` | Eliminar propuesta |
| Propuestas | GET | `/proposals/{proposal_id}/tech-sheet/pdf` | Descargar ficha técnica |
| Costos | GET | `/costs/catalog` | Catálogo FinOps de 19 servicios |
| Costos | GET | `/proposals/{proposal_id}/costs` | Costos guardados |
| Costos | POST | `/proposals/{proposal_id}/costs/recalculate` | Recalcular costos |
| Seguridad | GET | `/proposals/{proposal_id}/security` | Postura IAM guardada |
| Seguridad | PATCH | `/proposals/{proposal_id}/security` | Guardar controles IAM |
| Seguridad | POST | `/security/evaluate` | Previsualizar puntaje IAM |
| Regiones | GET | `/regions` | Catálogo del globo AWS |
| Regiones | POST | `/proposals/{proposal_id}/migrate-region` | Cambiar región de propuesta |
| Diagramas | GET | `/proposals/{proposal_id}/diagrams/drawio` | Cargar XML Draw.io |
| Diagramas | PUT | `/proposals/{proposal_id}/diagrams/drawio` | Guardar XML Draw.io |
| Diagramas | POST | `/diagrams/drawio/generate` | Generar XML de vista previa |
| Copiloto | POST | `/advisor/query` | Recomendar arquitectura, región o controles IAM usando catálogo y estado real |
| REA | POST | `/migration-evaluator/evaluate-document` | Analizar un archivo de texto/Markdown desde el backend |

## 4. Salud del backend

### `GET /`

Ruta informativa fuera de `/api/v1`.

Respuesta aproximada:

```json
{
  "application": "Cloud Diagnostix AWS Backend",
  "version": "1.0.0",
  "status": "online",
  "docs_url": "/docs",
  "rea_status_endpoint": "/api/v1/migration-evaluator/status",
  "subscriptions_endpoint": "/api/v1/subscriptions/status"
}
```

### `GET /api/v1/migration-evaluator/status`

Usarlo al abrir Planificación para mostrar si el motor está disponible.

```json
{
  "status": "online",
  "service": "Cloud Diagnostix REA Evaluator",
  "ai_engine": "Gemini 2.5 Flash + REA Heuristic Engine",
  "gemini_active": false
}
```

`gemini_active` indica si existe `GEMINI_API_KEY`; el motor heurístico puede continuar activo aunque sea `false`.

## 5. Autenticación IAM + código de correo

### Paso 1 — `POST /api/v1/auth/login`

Request:

```json
{
  "email": "arquitecto@clouddiagnostix.aws",
  "password": "AdminAws2026!"
}
```

Respuesta `200`:

```json
{
  "requires_email_code": true,
  "pre_auth_token": "<jwt_temporal_de_10_minutos>",
  "user": {
    "id": "uuid",
    "email": "arquitecto@clouddiagnostix.aws",
    "full_name": "Jorge Mendoza · Cloud Architect",
    "role": "AWS Solutions Architect",
    "theme_preference": "light",
    "intentos_usados": 0,
    "plan_actual": "free"
  }
}
```

Errores: `401` si correo o contraseña no son válidos.

### Paso 2 — `POST /api/v1/auth/verify-email-code`

Request:

```json
{
  "email_code": "482910",
  "pre_auth_token": "<pre_auth_token>"
}
```

Respuesta `200`:

```json
{
  "verified": true,
  "timestamp": "2026-11-02T12:00:00+00:00",
  "access_token": "<jwt_de_acceso>",
  "token_type": "bearer",
  "expires_in": 28800,
  "user": {
    "id": "uuid",
    "email": "arquitecto@clouddiagnostix.aws",
    "full_name": "Jorge Mendoza · Cloud Architect",
    "role": "AWS Solutions Architect",
    "theme_preference": "light",
    "intentos_usados": 0,
    "plan_actual": "free"
  }
}
```

Errores: `401` si el código enviado al correo es inválido, usado o expiró. El código es de 6 dígitos y se envía después de validar las credenciales.

## 6. Plan Free, cuota y conversión Premium

### Registro — `POST /api/v1/subscriptions/register-trial`

Request:

```json
{
  "email": "usuario@empresa.com",
  "full_name": "Ana Pérez"
}
```

Respuesta:

```json
{
  "user_id": "uuid",
  "email": "usuario@empresa.com",
  "intentos_usados": 0,
  "max_intentos": 2,
  "intentos_restantes": 2,
  "plan_actual": "free",
  "can_execute": true
}
```

### Estado — `GET /api/v1/subscriptions/status`

Se puede consultar con `?email=usuario@empresa.com`, `X-User-Email` o el claim `email` del Bearer JWT.

```http
GET /api/v1/subscriptions/status?email=usuario@empresa.com
```

En Premium, `max_intentos` e `intentos_restantes` son `null` y `can_execute` es `true`.

### Consumo manual — `POST /api/v1/subscriptions/consume-attempt`

Request:

```json
{
  "email": "usuario@empresa.com"
}
```

No debe llamarse además de `evaluate-zip` o `evaluate-github` para la misma auditoría: esos endpoints ya validan y consumen la cuota internamente.

Si se agotó el límite, el backend devuelve `402`:

```json
{
  "error": "LIMIT_REACHED",
  "message": "Has alcanzado el límite de 2 intentos gratuitos asociados a tu correo.",
  "email": "usuario@empresa.com",
  "intentos_usados": 2,
  "max_intentos": 2,
  "plan_actual": "free",
  "upgrade_url": "/pricing",
  "detail": {
    "error": "LIMIT_REACHED"
  }
}
```

El frontend debe detectar `status === 402` y `error === "LIMIT_REACHED"`, actualizar el contador y abrir el paywall.

### Checkout — `POST /api/v1/subscriptions/checkout`

Request:

```json
{
  "email": "usuario@empresa.com",
  "provider": "stripe",
  "success_url": "http://localhost:5173/aws-cloud/pricing?upgraded=true",
  "cancel_url": "http://localhost:5173/aws-cloud/pricing?canceled=true"
}
```

`provider` acepta `stripe` o `mercadopago`.

Respuesta:

```json
{
  "checkout_url": "http://localhost:5173/aws-cloud/pricing?upgraded=true&session_id=...",
  "session_id": "chk_stripe_...",
  "provider": "stripe",
  "email": "usuario@empresa.com",
  "plan_target": "premium",
  "amount_usd": 29.0,
  "currency": "USD"
}
```

### Webhook — `POST /api/v1/subscriptions/webhook`

Payload mínimo de prueba:

```json
{
  "event_type": "checkout.session.completed",
  "email": "usuario@empresa.com",
  "provider": "stripe",
  "data": {}
}
```

Respuesta:

```json
{
  "received": true,
  "upgraded": true,
  "email": "usuario@empresa.com",
  "plan_actual": "premium",
  "intentos_usados": 2,
  "message": "Suscripción actualizada exitosamente..."
}
```

### Reset de pruebas — `POST /api/v1/subscriptions/reset-trial`

Reinicia `intentos_usados = 0` y `plan_actual = free`. Es una ruta de pruebas y no debe estar expuesta en producción.

## 7. Motor REA: ZIP y GitHub

### ZIP — `POST /api/v1/migration-evaluator/evaluate-zip`

Usar `multipart/form-data`:

| Campo | Tipo | Obligatorio | Valor |
|---|---|---:|---|
| `file` | archivo `.zip` | Sí | Máximo 50 MB |
| `traffic_tier` | string | No | `low`, `medium`, `high`, `enterprise` |
| `target_region` | string | No | `sa-east-1` |
| `custom_notes` | string | No | Observaciones |
| `email` | string | No | Correo para cuota Free |

También acepta `X-User-Email` o el JWT. El gatekeeper se ejecuta antes de leer o descomprimir el archivo.

Ejemplo:

```ts
const form = new FormData();
form.append('file', zipFile);
form.append('traffic_tier', 'medium');
form.append('target_region', 'sa-east-1');
form.append('custom_notes', 'Migrar sin cambiar el dominio público');
form.append('email', user.email);

await fetch(`${API_BASE_URL}/migration-evaluator/evaluate-zip`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}`, 'X-User-Email': user.email },
  body: form,
});
```

No establecer manualmente `Content-Type`; el navegador agrega el boundary del multipart.

### GitHub — `POST /api/v1/migration-evaluator/evaluate-github`

```json
{
  "repo_url": "https://github.com/empresa/proyecto",
  "github_token": null,
  "traffic_tier": "medium",
  "target_region": "sa-east-1",
  "custom_notes": "Revisar Docker y persistencia",
  "email": "usuario@empresa.com"
}
```

La respuesta `EnterpriseEvaluationResponse` contiene:

```json
{
  "status": "success",
  "origin_detected": "GitHub: proyecto",
  "detected_configs": ["package.json", "Dockerfile"],
  "system_analysis": "...",
  "architecture_pattern": "...",
  "migration_strategy": "...",
  "well_architected_notes": ["..."],
  "technical_evidence": {
    "languages": ["TypeScript"],
    "frameworks": ["React"],
    "databases": [],
    "has_docker": true,
    "total_files": 48
  },
  "scenarios": [
    {
      "scenario_type": "Recommended-Production",
      "summary": "...",
      "services": [],
      "pricing": {
        "monthly_total_usd": 310.95,
        "annual_total_usd": 3731.4,
        "currency": "USD"
      }
    }
  ],
  "subscription_quota": {}
}
```

Los escenarios esperados son `Cost-Optimized`, `Recommended-Production` y `High-Availability-Enterprise`.

## 8. Propuestas: fuente principal del dashboard

La propuesta debe ser el estado persistente que alimenta Dashboard, Planificación, Costos, Seguridad e Infraestructura. No se deben mantener copias de negocio en `localStorage`.

### Crear — `POST /api/v1/proposals`

Request recomendado:

```json
{
  "solutionName": "Mi plataforma AWS",
  "appType": "API REST / Backend",
  "description": "Arquitectura evaluada por REA",
  "region": "sa-east-1",
  "estimatedUsers": 5000,
  "availabilityLevel": "99.95% (Alta Disponibilidad)",
  "selectedServices": ["VPC", "EC2", "RDS", "S3", "IAM", "CloudWatch"],
  "migrationGoal": "Modernización de Aplicación",
  "trafficTier": "medium",
  "appliedScenario": "Recommended-Production",
  "securityControls": {
    "rootBlocked": true,
    "mfaEnforced": true,
    "ec2Roles": true,
    "tls13": true,
    "s3EncryptionAndVersioning": true,
    "complianceAudits": true,
    "selected_services": ["VPC", "EC2", "RDS", "S3", "IAM", "CloudWatch"]
  }
}
```

El backend crea en cascada la propuesta, evaluación REA, controles IAM, costos FinOps y diagrama Draw.io inicial.

### Listar — `GET /api/v1/proposals`

Devuelve un arreglo de propuestas completas, ordenadas de la más reciente a la más antigua.

### Detalle — `GET /api/v1/proposals/{proposal_id}`

La respuesta incluye las dos nomenclaturas para compatibilidad:

```json
{
  "id": "uuid",
  "solution_name": "Mi plataforma AWS",
  "solutionName": "Mi plataforma AWS",
  "app_type": "API REST / Backend",
  "appType": "API REST / Backend",
  "region": "sa-east-1",
  "estimated_users": 5000,
  "estimatedUsers": 5000,
  "selected_services": ["EC2", "RDS"],
  "selectedServices": ["EC2", "RDS"],
  "monthly_budget": 310.95,
  "annual_budget": 3731.4,
  "status": "Aprobada",
  "applied_scenario": "Recommended-Production",
  "rea_evaluation": {},
  "security_controls": {},
  "cost_items": [],
  "created_at": "2026-11-02T12:00:00",
  "updated_at": "2026-11-02T12:00:00"
}
```

### Actualizar — `PUT /api/v1/proposals/{proposal_id}`

Es actualización parcial. Enviar únicamente los campos cambiados, usando camelCase o snake_case. Ejemplo:

```json
{
  "solutionName": "Mi plataforma AWS v2",
  "region": "us-east-1",
  "selectedServices": ["CloudFront", "ALB", "VPC", "ECS", "RDS", "S3", "IAM"],
  "estimatedUsers": 12000,
  "availabilityLevel": "99.99%"
}
```

### Eliminar — `DELETE /api/v1/proposals/{proposal_id}`

Respuesta:

```json
{ "deleted": true, "id": "uuid" }
```

### Ficha PDF — `GET /api/v1/proposals/{proposal_id}/tech-sheet/pdf`

Devuelve `application/pdf` con `Content-Disposition: attachment`. El cliente debe leer la respuesta como `blob` y crear un enlace temporal para descargarla.

## 9. FinOps y catálogo de servicios

### Catálogo — `GET /api/v1/costs/catalog`

Respuesta:

```json
{
  "hours_per_month": 730,
  "currency": "USD",
  "total_services": 19,
  "catalog": {
    "EC2": {
      "service_name": "Amazon Elastic Compute Cloud (EC2)",
      "category": "Cómputo",
      "role": "Capa de Cómputo de Aplicación",
      "specs": "...",
      "unit_cost": 60.74,
      "reason": "..."
    }
  }
}
```

El objeto `catalog` está indexado por código de servicio (`EC2`, `RDS`, `S3`, etc.).

### Costos de una propuesta — `GET /api/v1/proposals/{proposal_id}/costs`

Devuelve una lista con `service_id`, `service_name`, `service_code`, `category`, `instance_type_or_tier`, `quantity`, `hours_per_month`, `unit`, `unit_price`, `cost_per_hour`, `monthly_cost` y `annual_cost`.

### Recalcular — `POST /api/v1/proposals/{proposal_id}/costs/recalculate`

Request:

```json
{
  "selected_services": ["VPC", "EC2", "RDS", "S3", "IAM"],
  "traffic_tier": "high",
  "region": "sa-east-1",
  "scenario_type": "Recommended-Production"
}
```

Respuesta:

```json
{
  "proposal_id": "uuid",
  "monthly_total_usd": 310.95,
  "annual_total_usd": 3731.4,
  "currency": "USD",
  "items": []
}
```

El endpoint también actualiza `selected_services`, `monthly_budget` y `annual_budget` de la propuesta.

## 10. Seguridad IAM

### Previsualización — `POST /api/v1/security/evaluate`

No requiere `proposal_id` ni persiste cambios:

```json
{
  "rootBlocked": true,
  "mfaEnforced": true,
  "ec2Roles": true,
  "tls13": true,
  "s3EncryptionAndVersioning": false,
  "complianceAudits": true,
  "selected_services": ["EC2", "S3"]
}
```

Respuesta:

```json
{
  "proposal_id": null,
  "rootBlocked": true,
  "mfaEnforced": true,
  "ec2Roles": true,
  "tls13": true,
  "s3EncryptionAndVersioning": false,
  "complianceAudits": true,
  "security_score": 83,
  "posture_label": "Postura Aceptable",
  "recommended_iam_roles": ["..." ]
}
```

### Consultar — `GET /api/v1/proposals/{proposal_id}/security`

Usarlo al seleccionar una propuesta o al iniciar `AwsPlanning`/`AwsSecurity`.

### Guardar — `PATCH /api/v1/proposals/{proposal_id}/security`

Usar el mismo payload de controles. El backend recalcula el puntaje de 0 a 100 y lo persiste en `proposal_security_controls`.

## 11. Regiones e infraestructura

### Catálogo — `GET /api/v1/regions`

Respuesta:

```json
[
  {
    "code": "sa-east-1",
    "name": "América del Sur (São Paulo)",
    "lat": -23.5505,
    "lng": -46.6333
  }
]
```

### Migrar propuesta — `POST /api/v1/proposals/{proposal_id}/migrate-region`

Request:

```json
{
  "toRegion": "us-east-1",
  "fromRegion": "sa-east-1",
  "migratedServices": ["EC2", "RDS", "S3"]
}
```

El backend actualiza la región, registra `region_migrations_log` y regenera el XML Draw.io con la nueva región.

Respuesta:

```json
{
  "status": "migrated",
  "proposal_id": "uuid",
  "from_region": "sa-east-1",
  "to_region": "us-east-1",
  "migrated_services": ["EC2", "RDS", "S3"],
  "migrated_at": "2026-11-02T12:00:00"
}
```

## 12. React Flow y Draw.io

React Flow representa la vista interactiva del proyecto; el backend actual persiste el grafo dentro del diagrama Draw.io cuando se envía como `reactflowGraph`. No existe todavía un endpoint separado para consultar nodos React Flow.

### Cargar Draw.io — `GET /api/v1/proposals/{proposal_id}/diagrams/drawio`

Respuesta:

```json
{
  "id": "uuid",
  "proposal_id": "uuid",
  "diagram_type": "drawio_aws4",
  "region_snapshot": "sa-east-1",
  "drawio_xml": "<mxfile>...</mxfile>",
  "drawioXml": "<mxfile>...</mxfile>",
  "updated_at": "2026-11-02T12:00:00"
}
```

### Guardar Draw.io — `PUT /api/v1/proposals/{proposal_id}/diagrams/drawio`

```json
{
  "drawioXml": "<mxfile>...</mxfile>",
  "regionSnapshot": "sa-east-1",
  "reactflowGraph": {
    "nodes": [],
    "edges": []
  }
}
```

El backend valida que el XML sea válido y responde `400` si no lo es.

### Generar vista previa — `POST /api/v1/diagrams/drawio/generate`

```json
{
  "proposal_name": "Arquitectura AWS",
  "region": "sa-east-1",
  "selected_services": ["VPC", "EC2", "RDS", "S3"]
}
```

Respuesta:

```json
{
  "proposal_name": "Arquitectura AWS",
  "region": "sa-east-1",
  "drawio_xml": "<mxfile>...</mxfile>",
  "stencils_catalog_size": 19
}
```

## 13. Mapeo del dashboard a la API

| Pantalla/componente frontend | Estado simulado actual | Integración que debe usar |
|---|---|---|
| `AwsDashboard.tsx` | `AwsContext` inicia con demo/localStorage | `GET /proposals` y `GET /proposals/{id}`; derivar KPI de la respuesta |
| `AwsPlanning.tsx` | Mutaciones locales de propuesta, servicios, costos y seguridad | `PUT /proposals/{id}`, `POST /costs/recalculate`, `PATCH /security/{id}` |
| `AwsProjectAnalyzer.tsx` | Tiene fallback `localAnalyzer` si backend está offline | Solo `evaluate-zip`/`evaluate-github`; mostrar error si API no está disponible |
| `AwsCosts.tsx` / `AwsCostCalculator.tsx` | Cálculos desde `AwsContext` | `GET /costs/catalog`, `GET /proposals/{id}/costs`, `POST .../recalculate` |
| `AwsSecurity.tsx` / `AwsSecurityMatrix.tsx` | Controles locales | `GET` y `PATCH /proposals/{id}/security`; `POST /security/evaluate` para preview |
| `AwsInfrastructure.tsx` | Regiones y propuesta local | `GET /regions`, `POST /proposals/{id}/migrate-region` |
| `AwsServicesCatalog.tsx` | `awsServicesData` local | Adaptador desde `GET /costs/catalog` |
| `AwsNetwork.tsx` / `AwsDrawioEditor.tsx` | XML en `localStorage` | `GET` al montar y `PUT` al guardar Draw.io |
| `AwsReactFlowView.tsx` | `loadDemo()` y grafo construido desde estado local | Construir nodos desde `selected_services`; persistir `reactflowGraph` junto con Draw.io |
| `AwsLogin.tsx` | Código local simulado y usuario local | `POST /auth/login`, luego `POST /auth/verify-email-code` |
| `AwsLanding.tsx` | Solo comprueba `localStorage.token` | Comprobar el JWT real y el estado de sesión |
| `SubscriptionContext.tsx` | Ya conecta cuota/checkout/webhook local | Mantener API real; eliminar confirmación automática cuando exista pasarela real |

## 14. Datos simulados que deben retirarse

### Fuentes de negocio simuladas

1. `separacion_aws/src/features/modules/aws-cloud/data/awsDemoData.ts`
   - `demoProposal`
   - `demoCostItems`
   - `demoSecurityControls`
2. `AwsContext.tsx`
   - importación de `awsDemoData`
   - `loadDemo()` y `loadSampleArchitecture()`
   - hidratación inicial desde las claves de propuesta, servicios, costos y seguridad
   - persistencia de esos datos de negocio en `localStorage`
3. `AwsSidebar.tsx`
   - botón `Cargar Demo`
4. `AwsReactFlowView.tsx`
   - botón `Cargar Propuesta Demo`
5. `AwsDrawioEditor.tsx`
   - `clouddiagnostix_drawio_aws4_v2` y su firma; reemplazar por GET/PUT del diagrama
6. `analyzerService.ts`
   - `localAnalyzer`; no debe presentar una evaluación local como si viniera del backend
7. `AwsLogin.tsx`
   - `cdx-jwt-${Date.now()}`
   - generación local de OTP
   - usuario y permisos simulados

### Persistencias locales que sí pueden mantenerse

- Preferencia visual de tema (`ThemeContext`)
- Pestaña activa de Network (`aws:networkTab`), si no se considera dato de negocio
- Estado efímero de UI: modales, filtros y expansión de paneles

## 15. Flujo recomendado para conectar todo

```text
Login
  -> POST /auth/login
  -> POST /auth/verify-email-code
  -> guardar access_token + user
  -> GET /subscriptions/status
  -> GET /proposals
  -> GET /proposals/{id}
  -> cargar dashboard

Planificación
  -> cambiar servicios o parámetros
  -> POST /proposals/{id}/costs/recalculate
  -> PATCH /proposals/{id}/security
  -> PUT /proposals/{id}

Análisis REA
  -> registrar correo si aún no existe
  -> POST /migration-evaluator/evaluate-zip o evaluate-github
  -> recibir subscription_quota
  -> actualizar contador
  -> si 402 LIMIT_REACHED, abrir /pricing

Red y diagramas
  -> GET /regions
  -> POST /proposals/{id}/migrate-region
  -> GET /proposals/{id}/diagrams/drawio
  -> editar React Flow/Draw.io
  -> PUT /proposals/{id}/diagrams/drawio

Pago
  -> POST /subscriptions/checkout
  -> redirigir a checkout_url
  -> webhook de la pasarela -> POST /subscriptions/webhook
  -> GET /subscriptions/status
```

## 16. Cliente HTTP mínimo sugerido

```ts
export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') ?? 'null');
  const headers = new Headers(init.headers);
  headers.set('Accept', 'application/json');
  if (init.body && !(init.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (user?.email) headers.set('X-User-Email', user.email);

  const response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers });
  const body = response.headers.get('content-type')?.includes('application/json')
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    const error = new Error(body?.message ?? body?.detail ?? 'Error de API');
    Object.assign(error, { status: response.status, payload: body });
    throw error;
  }
  return body as T;
}
```

El interceptor de suscripción debe conservar un comportamiento especial para `402 LIMIT_REACHED`: refrescar `/subscriptions/status`, abrir el modal Premium y no ejecutar ningún fallback local.

## 17. Errores y comportamiento del frontend

| HTTP | Significado | Acción |
|---:|---|---|
| `400` | Payload inválido, ZIP inválido, XML Draw.io inválido o correo faltante | Mostrar validación concreta |
| `401` | Credenciales/código de correo inválidos o sesión no válida | Volver al login |
| `402` | Cuota Free agotada | Abrir paywall, no usar datos simulados |
| `404` | Propuesta o recurso inexistente | Recargar lista o mostrar recurso eliminado |
| `422` | Error de validación Pydantic | Mostrar campos inválidos |
| `500` | Error del backend | Mostrar estado offline y permitir reintentar |

## 18. Hallazgos del backend que deben considerarse antes de producción

1. Las rutas de propuestas, costos, seguridad, regiones y diagramas aparecen actualmente sin una dependencia de autorización JWT en OpenAPI. Cualquier usuario que conozca un `proposal_id` podría consultar o modificar datos. Debe agregarse autorización por usuario antes de publicar.
2. `CORS` está configurado con `allow_origins=["*"]` y `allow_credentials=True`. En producción debe limitarse al dominio real del frontend.
3. `checkout` actualmente genera una URL local de demostración; no crea todavía una sesión real de Stripe/MercadoPago.
4. `webhook` no valida firma de Stripe/MercadoPago. Debe verificarse la firma y la idempotencia del evento antes de cambiar `plan_actual`.
5. `reset-trial` es una herramienta de testing y debe protegerse o eliminarse en producción.
6. El usuario creado por `register-trial` recibe una contraseña interna predeterminada. No usar este comportamiento como registro final de usuarios sin un flujo de activación seguro.
7. `AwsLogin.tsx` consume el login real y verifica el código de correo en `/auth/verify-email-code`; el backend debe tener SMTP configurado para entregar los mensajes.
8. `AwsProjectAnalyzer.tsx` todavía conserva un fallback local. Para que el dashboard deje de trabajar con datos simulados, el fallback debe convertirse en error visible o en estado “backend no disponible”.
9. No existe una API separada para el grafo React Flow. El contrato actual permite persistirlo dentro de `reactflowGraph` en el registro Draw.io.

## 19. Pruebas de aceptación para la integración

Backend:

```powershell
cd backend_aws
pytest -q tests/test_subscription_flow.py
```

Frontend:

```powershell
cd separacion_aws
npm.cmd run build
```

Checklist manual:

- [ ] El login llama a `/auth/login` y no crea `cdx-jwt-*`.
- [ ] El código de 6 dígitos se valida en `/auth/verify-email-code`.
- [ ] Al entrar al dashboard se carga una propuesta desde `/proposals`.
- [ ] No se muestra `Cargar Demo`, `demoProposal` ni `demoCostItems`.
- [ ] Cambiar servicios recalcula con `/costs/recalculate`.
- [ ] Cambiar controles IAM persiste con `PATCH /security`.
- [ ] Cambiar región persiste con `/migrate-region`.
- [ ] Draw.io carga desde GET y guarda con PUT.
- [ ] Las auditorías 1 y 2 consumen cuota.
- [ ] La tercera auditoría abre el paywall con `402 LIMIT_REACHED`.
- [ ] Después del webhook, `/subscriptions/status` devuelve `premium` y permite auditar sin límite.
- [ ] Una caída del backend muestra error de conexión y no datos de negocio falsos.

## 20. Referencias del repositorio

- [Router API v1](../app/api/v1/router.py)
- [Endpoints](../app/api/v1/endpoints/)
- [Schemas](../app/schemas/)
- [Modelos SQLAlchemy](../app/models/)
- [Modelo SQL](../schema.sql)
- [Regla de suscripción](../plan_suscripcion.txt)
- [Cliente REA actual del frontend](../../separacion_aws/src/features/modules/aws-cloud/services/analyzerService.ts)
- [Contexto AWS actual del frontend](../../separacion_aws/src/features/modules/aws-cloud/context/AwsContext.tsx)

