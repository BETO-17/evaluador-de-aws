# Cloud Diagnostix

Cloud Diagnostix es una plataforma para analizar proyectos de software y planificar su migración a Amazon Web Services (AWS). El sistema inspecciona la evidencia técnica real de un proyecto, propone una arquitectura cloud, estima costos, evalúa controles de seguridad y genera diagramas técnicos editables.

## ¿Qué problema resuelve?

La plataforma ayuda a transformar un proyecto existente —por ejemplo, un repositorio GitHub, un archivo ZIP o un documento técnico— en una propuesta de migración AWS trazable. El resultado incluye:

- análisis de lenguajes, frameworks, bases de datos, contenedores y configuraciones detectadas;
- evaluación arquitectónica REA con estrategia de migración y patrón recomendado;
- tres escenarios: `Cost-Optimized`, `Recommended-Production` y `High-Availability-Enterprise`;
- selección de servicios AWS y estimación mensual/anual de costos;
- evaluación de controles IAM y postura de seguridad;
- ficha técnica REA exportable en PDF;
- arquitectura visual en React Flow y Draw.io con relaciones entre servicios;
- gestión de regiones AWS y bitácora de migraciones;
- autenticación, verificación por código enviado al correo y recuperación de contraseña;
- control de uso del plan Free y activación del plan Premium.

## Cómo funciona

1. El usuario carga un ZIP, proporciona un repositorio GitHub o sube un documento.
2. El backend inspecciona el contenido y genera evidencia técnica del proyecto.
3. El motor REA utiliza Claude como proveedor principal cuando está configurado y Gemini como respaldo. Si ningún proveedor está disponible, se informa explícitamente el uso del motor heurístico local.
4. La evaluación normaliza los servicios contra el catálogo AWS del backend y calcula los costos localmente.
5. El usuario elige un escenario y lo aplica a una propuesta.
6. La propuesta se guarda junto con su ficha REA, controles IAM, costos, grafo React Flow y diagrama Draw.io.

## Estructura del proyecto

```text
aws_proyecto/
├── backend_aws/       # API FastAPI, motor REA, base de datos y MCP Draw.io
├── separacion_aws/    # Aplicación web React + Vite
├── context_backend/   # Contratos, arquitectura y documentación técnica
└── README.md
```

### Backend

`backend_aws` contiene la API REST, los modelos SQLAlchemy, el motor de evaluación REA, el catálogo y calculadora de costos, la seguridad IAM, la autenticación y el generador de diagramas AWS4.

### Frontend

`separacion_aws` contiene el dashboard web. Sus módulos principales son planificación cloud, costos, infraestructura, seguridad IAM, arquitectura de red, ficha técnica REA y suscripciones.

## Inicio rápido

### Backend

Desde `backend_aws`:

```powershell
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8080 --reload
```

La documentación de la API queda disponible en:

```text
http://localhost:8080/docs
```

### Frontend

Desde `separacion_aws`:

```powershell
npm install
npm run dev
```

La aplicación normalmente queda disponible en `http://localhost:5173`.

## Configuración de IA

Las credenciales deben mantenerse únicamente en `backend_aws/.env`. No deben incluirse en el frontend ni en el repositorio.

Variables principales:

```env
CLAUDE_API_KEY=...
CLAUDE_MODEL=claude-sonnet-5-5
GEMINI_API_KEY=...
GEMINI_MODEL=gemini-3.8-flash
```

El backend no expone los valores de las claves. En el estado del evaluador solo informa qué proveedor está activo.

## Diagramas de arquitectura

La arquitectura generada se guarda en `architecture_diagrams` y se puede visualizar de dos formas:

- **React Flow:** muestra nodos, relaciones, razones de recomendación y flujo entre capas.
- **Draw.io:** permite editar y exportar el diagrama usando stencils oficiales `mxgraph.aws4`.

El MCP de Draw.io se encuentra en:

```text
backend_aws/.agents/skills/drawio-aws4-mcp/
```

## Pruebas

Desde `backend_aws`:

```powershell
pytest -q
```

Para validar el build del frontend:

```powershell
npm run build
```

Los costos mostrados son estimaciones calculadas por el catálogo interno de Cloud Diagnostix; no representan cargos reales de una cuenta AWS hasta validar y desplegar la arquitectura en AWS.
