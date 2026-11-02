# 00. Arquitectura General del Backend — Cloud Diagnostix (AWS Cloud Suite)

Este directorio (`context_backend/`) contiene toda la especificación técnica, arquitectura, modelos de base de datos, contratos de API REST, lógica del **Motor Evaluador REA (Reasoning & Enterprise Architecture)**, seguridad **IAM + TOTP (2FA)** y código base para construir el backend completo del proyecto **Cloud Diagnostix**.

---

## 1. Índice de Documentación en `context_backend/`

1. **[`00_README_ARQUITECTURA_BACKEND.md`](./00_README_ARQUITECTURA_BACKEND.md)**: Visión general, stack tecnológico, estructura de carpetas y configuración del servidor.
2. **[`01_MODELO_DATOS_Y_BASE_DE_DATOS.md`](./01_MODELO_DATOS_Y_BASE_DE_DATOS.md)**: Esquema SQL (PostgreSQL), tablas, relaciones y modelos de datos completos.
3. **[`02_CONTRATOS_API_REST_ENDPOINTS.md`](./02_CONTRATOS_API_REST_ENDPOINTS.md)**: Todos los endpoints REST (`/api/v1/...`), payloads de entrada y respuestas JSON exactas que consume el frontend en React.
4. **[`03_MOTOR_REA_E_INTELIGENCIA_ARTIFICIAL.md`](./03_MOTOR_REA_E_INTELIGENCIA_ARTIFICIAL.md)**: Lógica de auditoría de proyectos (`.zip`, GitHub, documentos), detección de stack, integración con **Google Gemini** y cálculo de los 3 escenarios (`Cost-Optimized`, `Recommended-Production`, `High-Availability-Enterprise`).
5. **[`04_SEGURIDAD_IAM_TOTP_Y_DIAGRAMAS_AWS4.md`](./04_SEGURIDAD_IAM_TOTP_Y_DIAGRAMAS_AWS4.md)**: Autenticación JWT + TOTP 6 dígitos (RFC 6238), motor de calificación de seguridad IAM por proyecto de migración (0-100 pts), exportación PDF de la Ficha Técnica REA y generación XML de Draw.io con iconos `mxgraph.aws4`.
6. **[`05_CODIGO_BASE_ARRANQUE_FASTAPI.md`](./05_CODIGO_BASE_ARRANQUE_FASTAPI.md)**: Código fuente funcional en Python (FastAPI) listo para levantar el backend en el puerto `8080` o `8000`.

---

## 2. Stack Tecnológico Recomendado

El frontend (`src/features/modules/aws-cloud/services/analyzerService.ts`) está preconfigurado para conectarse automáticamente a un microservicio REST en `http://localhost:8080/api/v1` o `http://localhost:8000/api/v1`.

| Capa | Tecnología Recomendada | Propósito en Cloud Diagnostix |
| :--- | :--- | :--- |
| **Framework API** | **FastAPI (Python 3.11+)** + `uvicorn` | Endpoints asíncronos de alto rendimiento, validación Pydantic v2 y documentación OpenAPI (`/docs`) automática. |
| **Base de Datos** | **PostgreSQL 16** (o SQLite en desarrollo local) | Persistencia de usuarios, propuestas cloud, evaluaciones REA (JSONB), controles IAM, costos FinOps y diagramas `.drawio`. |
| **ORM & Migraciones** | **SQLAlchemy 2.0** + **Alembic** | Mapeo objeto-relacional y versionado de esquemas de base de datos. |
| **Motor IA / REA** | **Google GenAI SDK (`google-genai`)** — Modelo `gemini-2.5-flash` | Auditoría inteligente de código fuente, recomendación de patrones AWS Well-Architected y dimensionamiento de instancias. |
| **Seguridad & 2FA** | **PyJWT (`python-jose`)** + **`pyotp`** + **`passlib[bcrypt]`** | Autenticación con contraseña + código TOTP de 6 dígitos (RFC 6238) cada 30 segundos. |
| **Análisis de Código** | `zipfile` (nativo), `httpx` / `gitpython` | Descompresión en memoria de paquetes `.zip` (hasta 50 MB) e inspección de repositorios públicos/privados de GitHub. |

---

## 3. Estructura de Carpetas del Proyecto Backend

```text
backend_clouddiagnostix/
├── .env.example
├── requirements.txt
├── alembic.ini
├── README.md
└── app/
    ├── __init__.py
    ├── main.py                        # Punto de entrada FastAPI, CORS y routers
    ├── core/
    │   ├── config.py                  # Variables de entorno ( Settings con pydantic-settings )
    │   ├── database.py                # Engine SQLAlchemy y sesión de BD
    │   └── security.py                # Hash bcrypt, tokens JWT y verificación TOTP (pyotp)
    ├── models/                        # Modelos SQLAlchemy (Tablas de BD)
    │   ├── user.py
    │   ├── proposal.py
    │   ├── rea_evaluation.py
    │   ├── security_control.py
    │   ├── cost_item.py
    │   └── diagram.py
    ├── schemas/                       # Esquemas Pydantic (Request / Response JSON)
    │   ├── auth_schema.py
    │   ├── proposal_schema.py
    │   ├── rea_schema.py
    │   ├── security_schema.py
    │   └── cost_schema.py
    ├── services/                      # Lógica de negocio y motores
    │   ├── project_inspector.py       # Analizador de archivos ZIP y repositorios GitHub
    │   ├── rea_engine.py              # Motor REA (Heurística + Gemini AI + 3 Escenarios)
    │   ├── pricing_calculator.py      # Catálogo oficial de precios AWS y cálculo FinOps
    │   ├── iam_security_scorer.py     # Evaluación de postura de seguridad IAM (0-100 pts)
    │   ├── drawio_aws4_builder.py     # Generador de XML Draw.io con stencils mxgraph.aws4
    │   └── pdf_tech_sheet.py          # Generador del reporte PDF A4 de Ficha Técnica REA
    └── api/
        └── v1/
            ├── router.py              # Agrupador de rutas /api/v1
            └── endpoints/
                ├── auth.py            # /api/v1/auth/*
                ├── migration_rea.py   # /api/v1/migration-evaluator/*
                ├── proposals.py       # /api/v1/proposals/*
                ├── costs.py           # /api/v1/proposals/{id}/costs/*
                ├── security.py        # /api/v1/proposals/{id}/security/*
                ├── regions.py         # /api/v1/regions/*
                └── diagrams.py        # /api/v1/proposals/{id}/diagrams/*
```

---

## 4. Variables de Entorno (`.env.example`)

```ini
# Configuración del Servidor
APP_NAME="Cloud Diagnostix AWS Backend"
APP_VERSION="1.0.0"
HOST="0.0.0.0"
PORT=8080
DEBUG=True

# Orígenes permitidos por CORS (Frontend Vite en 5173 / 3000)
CORS_ORIGINS="http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000"

# Base de Datos (PostgreSQL o SQLite para desarrollo rápido)
DATABASE_URL="postgresql+psycopg2://postgres:postgres@localhost:5432/clouddiagnostix_db"
# Alternativa local sin servidor:
# DATABASE_URL="sqlite:///./clouddiagnostix.db"

# Seguridad JWT & TOTP (RFC 6238)
JWT_SECRET_KEY="cambia_esta_clave_secreta_por_una_cadena_aleatoria_segura_256_bits"
JWT_ALGORITHM="HS256"
ACCESS_TOKEN_EXPIRE_MINUTES=480
DEFAULT_TOTP_SECRET="JBSWY3DPEHPK3PXP"

# Motor de IA para Evaluación REA (Google Gemini API)
GEMINI_API_KEY="AIzaSyYourGeminiApiKeyHere"
GEMINI_MODEL="gemini-2.5-flash"

# GitHub Token opcional para elevar límite de rate-limit al auditar repositorios
GITHUB_API_TOKEN=""
```

---

## 5. Conexión Nativa con el Frontend Existente

El frontend actual ya cuenta con detección automática de puerto y salud del backend en `src/features/modules/aws-cloud/services/analyzerService.ts`:

1. Al abrir el módulo **Planificación Cloud**, el frontend consulta:
   - `GET http://localhost:8080/api/v1/migration-evaluator/status` (y si no responde, prueba el puerto `8000`).
2. Si el backend responde `200 OK` con:
   ```json
   {
     "status": "online",
     "service": "Cloud Diagnostix REA Evaluator",
     "ai_engine": "Gemini 2.5 Flash + REA Heuristic Engine",
     "gemini_active": true
   }
   ```
   el indicador del analizador pasa a **"Motor REA Online"** y envía los archivos `.zip` y URLs de GitHub directamente al backend.

