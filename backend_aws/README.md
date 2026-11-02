# Cloud Diagnostix — AWS Backend, Motor REA, Gatekeeper Freemium & Draw.io AWS4 MCP

Backend oficial en **FastAPI (Python 3.11+)** para **Cloud Diagnostix (AWS Cloud Suite)**, construido siguiendo la arquitectura en capas, las reglas de comentarios de [`AGENT.md`](./AGENT.md), las skills en [`.agents/skills/`](./.agents/skills/), las especificaciones de [`context_backend/`](./context_backend/) y el modelo de suscripción Freemium de [`plan_suscripcion.txt`](./plan_suscripcion.txt).

---

## 1. Inicio Rápido (Puerto `8080`)

```powershell
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8080 --reload
```

- **Documentación Interactiva Swagger UI**: `http://localhost:8080/docs`
- **Salud del Motor REA (`analyzerService.ts`)**: `http://localhost:8080/api/v1/migration-evaluator/status`

---

## 2. Credenciales Demo Sembradas Automáticamente

- **Email**: `arquitecto@clouddiagnostix.aws`
- **Password**: `AdminAws2026!`
- **Secreto MFA TOTP (RFC 6238, 6 dígitos, 30s)**: `JBSWY3DPEHPK3PXP`
- **Propuesta Inicial ID**: `c4e8b215-9c3a-4f2b-8b21-987654321def`

---

## 3. Endpoints Principales (`/api/v1`)

| Método | Ruta | Descripción |
| :--- | :--- | :--- |
| `GET` | `/api/v1/migration-evaluator/status` | Verifica estado online del Motor REA y Gemini 2.5 Flash. |
| `POST` | `/api/v1/migration-evaluator/evaluate-zip` | Audita un `.zip` en memoria (con Gatekeeper Freemium) y genera 3 escenarios FinOps. |
| `POST` | `/api/v1/migration-evaluator/evaluate-github` | Audita un repo GitHub (con Gatekeeper Freemium) y devuelve `EnterpriseEvaluationResponse`. |
| `POST` | `/api/v1/subscriptions/register-trial` | Crea o recupera un correo con `intentos_usados = 0` y `plan_actual = 'free'`. |
| `GET` | `/api/v1/subscriptions/status` | Consulta intentos usados (`0/2`) y plan actual (`'free'` \| `'premium'`) por correo. |
| `POST` | `/api/v1/subscriptions/consume-attempt` | Valida el Gatekeeper y consume `+1` intento o devuelve `HTTP 402 LIMIT_REACHED`. |
| `POST` | `/api/v1/subscriptions/checkout` | Genera sesión de pago en Stripe o MercadoPago para pasar a `'premium'`. |
| `POST` | `/api/v1/subscriptions/webhook` | Webhook de pasarela que ejecuta `UPDATE users SET plan_actual = 'premium'`. |
| `POST` | `/api/v1/auth/login` | Valida correo/contraseña y emite `pre_auth_token`. |
| `POST` | `/api/v1/auth/verify-totp` | Verifica código TOTP de 6 dígitos (`valid_window=1`) y emite JWT. |
| `GET / POST` | `/api/v1/proposals` | Lista o crea propuestas de arquitectura cloud con Ficha REA e IAM. |
| `GET / PUT / DELETE` | `/api/v1/proposals/{id}` | Detalle, actualización o eliminación de propuesta. |
| `PATCH` | `/api/v1/proposals/{id}/security` | Actualiza los 6 controles IAM y recalcula puntaje `0-100 pts`. |
| `POST` | `/api/v1/proposals/{id}/migrate-region` | Migra la propuesta de región AWS y registra bitácora del Globo 3D. |
| `GET` | `/api/v1/proposals/{id}/tech-sheet/pdf` | Descarga el PDF A4 de la Ficha Técnica REA y Seguridad IAM. |
| `GET / PUT` | `/api/v1/proposals/{id}/diagrams/drawio` | Obtiene o guarda el XML Draw.io con stencils oficiales `mxgraph.aws4`. |
