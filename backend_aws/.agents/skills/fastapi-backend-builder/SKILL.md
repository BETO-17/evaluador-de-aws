---
name: fastapi-backend-builder
description: >-
  Construye, extiende y depura el backend en FastAPI (Python 3.11+) de Cloud Diagnostix,
  incluyendo modelos SQLAlchemy 2.0 (PostgreSQL 16 / SQLite), esquemas Pydantic v2,
  autenticación JWT + MFA TOTP de 6 dígitos (RFC 6238), cálculo de postura de seguridad
  IAM (0-100 pts) y todos los endpoints REST (/api/v1/*). Úsala cuando el usuario pida
  crear el servidor FastAPI, implementar rutas HTTP, configurar la base de datos,
  programar el login con TOTP o gestionar propuestas cloud.
---

# Skill: Construcción del Backend en FastAPI (`fastapi-backend-builder`)

Esta skill contiene el procedimiento paso a paso para levantar y desarrollar el backend completo de **Cloud Diagnostix** en **FastAPI**, garantizando compatibilidad 1:1 con el frontend en React y el cumplimiento estricto de comentarios en el código.

---

## 1. Stack y Dependencias Oficiales (`requirements.txt`)

Utiliza siempre las versiones probadas en [`context_backend/05_CODIGO_BASE_ARRANQUE_FASTAPI.md`](../../../context_backend/05_CODIGO_BASE_ARRANQUE_FASTAPI.md):

```txt
fastapi==0.115.6
uvicorn[standard]==0.34.0
python-multipart==0.0.20
pydantic==2.10.4
pydantic-settings==2.7.1
sqlalchemy==2.0.36
psycopg2-binary==2.9.10
pyotp==2.9.0
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
httpx==0.28.1
google-genai==0.8.0
```

---

## 2. Flujo de Implementación Paso a Paso

### Paso 1: Configuración Base y CORS (`app/core/config.py` y `app/main.py`)
1. Configura `pydantic-settings` para leer `.env` con valores por defecto seguros de desarrollo:
   - `PORT=8080` (compatible también con `8000`).
   - `CORS_ORIGINS="http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000"`.
   - `DEFAULT_TOTP_SECRET="JBSWY3DPEHPK3PXP"`.
   - `GEMINI_MODEL="gemini-2.5-flash"`.
   - `DATABASE_URL` soportando tanto PostgreSQL (`postgresql+psycopg2://...`) como fallback local SQLite (`sqlite:///./clouddiagnostix.db`).
2. Agrega comentarios detallados en `main.py` explicando cómo `analyzerService.ts` detecta el puerto `8080` o `8000` mediante `GET /api/v1/migration-evaluator/status`.

### Paso 2: Modelos de Base de Datos (`app/models/`)
Implementa las **7 tablas** de [`context_backend/01_MODELO_DATOS_Y_BASE_DE_DATOS.md`](../../../context_backend/01_MODELO_DATOS_Y_BASE_DE_DATOS.md) (consulta detalles en [`references/database_models_and_iam.md`](./references/database_models_and_iam.md)):
1. `users`: `id`, `email`, `full_name`, `password_hash`, `role`, `totp_secret` (default `'JBSWY3DPEHPK3PXP'`), `totp_enabled`, `theme_preference` (`'light'` | `'dark'`).
2. `cloud_proposals`: `solution_name`, `app_type`, `description`, `region` (default `'sa-east-1'`), `estimated_users`, `availability_level`, `selected_services` (JSONB), `migration_goal`, `monthly_budget`, `annual_budget`, `status`, `applied_scenario`, `is_active`.
3. `proposal_rea_evaluations`: relación 1:1 con `cloud_proposals`, almacena `origin_detected`, `detected_configs`, `system_analysis`, `architecture_pattern`, `migration_strategy`, `well_architected_notes`, `technical_evidence`, `scenarios` (JSONB con los 3 escenarios).
4. `proposal_security_controls`: relación 1:1 con `cloud_proposals`, almacena los 6 controles booleanos, `security_score` (`0-100`) y `posture_label`.
5. `cost_simulation_items`: desglose FinOps por servicio (`hours_per_month` default `730`).
6. `architecture_diagrams`: almacena `diagram_type` (`'drawio_aws4'` | `'reactflow'`), `drawio_xml` (`TEXT`), `reactflow_graph` (`JSONB`) y `region_snapshot`.
7. `region_migrations_log`: bitácora de migraciones entre regiones AWS (`from_region`, `to_region`, `migrated_services`) para la animación del globo 3D.

### Paso 3: Autenticación JWT + TOTP 2FA (`app/core/security.py` y `app/api/v1/endpoints/auth.py`)
1. **`POST /api/v1/auth/login`**:
   - Verifica credenciales (`email`, `password`).
   - Emite un `pre_auth_token` temporal con `requires_totp: true` y los datos básicos del usuario.
2. **`POST /api/v1/auth/verify-totp`**:
   - Valida el código de **6 dígitos** usando `pyotp.TOTP(secret, digits=6, interval=30).verify(code.strip(), valid_window=1)`.
   - Documenta con un comentario inline que `valid_window=1` acepta $\pm 1$ ventana de 30s para evitar rechazos por desfase de reloj entre el navegador y el backend.
   - Devuelve `access_token`, `token_type: "bearer"`, `expires_in: 28800` y el objeto `user` (o `{ "verified": true, "timestamp": ... }` en verificación directa).

### Paso 4: Motor de Calificación de Seguridad IAM (`app/services/iam_security_scorer.py`)
Implementa el cálculo determinista de `0 a 100 puntos` documentando cada regla con comentarios inline:
- `rootBlocked == True` -> `+20 pts`
- `mfaEnforced == True` -> `+20 pts`
- `ec2Roles == True` **y** `"EC2" in selected_services` -> `+20 pts`
- `tls13 == True` -> `+15 pts`
- `s3EncryptionAndVersioning == True` **y** `"S3" in selected_services` -> `+15 pts`
- `complianceAudits == True` -> `+10 pts`
- Clasificación `posture_label`:
  - `score >= 80`: `"Postura Robusta"`
  - `40 <= score <= 79`: `"Postura Aceptable"`
  - `score < 40`: `"Postura Crítica"`

### Paso 5: Endpoints REST `/api/v1` (`app/api/v1/endpoints/`)
Asegúrate de implementar y documentar con docstrings en español todos los contratos de [`context_backend/02_CONTRATOS_API_REST_ENDPOINTS.md`](../../../context_backend/02_CONTRATOS_API_REST_ENDPOINTS.md):
- `GET /api/v1/migration-evaluator/status`
- `POST /api/v1/migration-evaluator/evaluate-zip`
- `POST /api/v1/migration-evaluator/evaluate-github`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/verify-totp`
- `GET / POST /api/v1/proposals`
- `GET / PUT / DELETE /api/v1/proposals/{id}`
- `POST /api/v1/proposals/{id}/migrate-region`
- `PATCH /api/v1/proposals/{id}/security`
- `GET /api/v1/proposals/{id}/tech-sheet/pdf`
- `GET / PUT /api/v1/proposals/{id}/diagrams/drawio`

---

## 3. Reglas de Comentarios en FastAPI

- Todo endpoint `@router.get` / `@router.post` / `@router.put` / `@router.patch` / `@router.delete` debe tener `summary`, `description` y un **docstring en español** que detalle el contrato JSON esperado por el frontend.
- Cada esquema Pydantic (`BaseModel`) debe incluir comentarios explicando la correspondencia entre nombres `camelCase` del frontend (ej. `rootBlocked`, `s3EncryptionAndVersioning`) y `snake_case` de la base de datos (`root_blocked`, `s3_encryption_and_versioning`).

---

## 4. Validación Rápida del Servidor

Para verificar que el servidor FastAPI arranca y responde según el contrato del frontend:
```powershell
uvicorn app.main:app --host 0.0.0.0 --port 8080
```
Y probar el endpoint de salud:
```powershell
Invoke-RestMethod -Uri "http://localhost:8080/api/v1/migration-evaluator/status"
```
Debe devolver `status: "online"` y `service: "Cloud Diagnostix REA Evaluator"`.

