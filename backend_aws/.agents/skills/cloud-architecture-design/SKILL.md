---
name: cloud-architecture-design
description: >-
  Diseña y valida la arquitectura en capas del backend FastAPI de Cloud Diagnostix y las
  arquitecturas objetivo en Amazon Web Services (AWS Well-Architected Framework). Úsala
  cuando el usuario pida estructurar carpetas, diseñar capas (API, Schemas, Services,
  Models, Core), aplicar los 6 pilares de AWS Well-Architected, definir SLAs Multi-AZ o
  Multi-Región, auditar la separación de responsabilidades o aplicar el estándar de
  comentarios arquitectónicos en el código.
---

# Skill: Arquitectura de Software Backend y AWS Cloud (`cloud-architecture-design`)

Esta skill guía el diseño estructural del microservicio backend de **Cloud Diagnostix** y las reglas del **AWS Well-Architected Framework** aplicadas a cada propuesta cloud generada o almacenada.

---

## 1. Arquitectura en Capas del Backend (`Clean Layered Architecture`)

El backend debe organizarse estrictamente en **5 capas desacopladas** dentro de `app/`:

```text
app/
├── main.py                        # Bootstrap FastAPI, CORS y montaje de routers
├── core/                          # 1. Capa Transversal (Config, DB Engine, Seguridad JWT/TOTP)
│   ├── config.py
│   ├── database.py
│   └── security.py
├── models/                        # 2. Capa de Persistencia (SQLAlchemy 2.0 ORM + JSONB)
│   ├── user.py
│   ├── proposal.py
│   ├── rea_evaluation.py
│   ├── security_control.py
│   ├── cost_item.py
│   └── diagram.py
├── schemas/                       # 3. Capa de Contratos DTO (Pydantic v2 Request/Response)
│   ├── auth_schema.py
│   ├── proposal_schema.py
│   ├── rea_schema.py
│   ├── security_schema.py
│   └── cost_schema.py
├── services/                      # 4. Capa de Dominio y Motores de Negocio
│   ├── project_inspector.py       # Inspector estático de paquetes .zip y GitHub
│   ├── rea_engine.py              # Motor REA (Heurística + Gemini 2.5 Flash + 3 Escenarios)
│   ├── pricing_calculator.py      # Catálogo oficial de 19 servicios AWS y cálculo FinOps
│   ├── iam_security_scorer.py     # Puntaje de postura de seguridad IAM (0-100 pts)
│   ├── drawio_aws4_builder.py     # Generador de XML Draw.io con stencils mxgraph.aws4
│   └── pdf_tech_sheet.py          # Exportador PDF A4 de la Ficha Técnica REA
└── api/                           # 5. Capa de Presentación HTTP REST (/api/v1)
    └── v1/
        ├── router.py
        └── endpoints/
            ├── auth.py
            ├── migration_rea.py
            ├── proposals.py
            ├── costs.py
            ├── security.py
            ├── regions.py
            └── diagrams.py
```

### Reglas de Dependencia entre Capas:
1. **`api/v1/endpoints/*`** solo recibe peticiones HTTP, valida payloads con **`schemas/*`** y delega toda la lógica a **`services/*`**. Prohibido escribir lógica FinOps, heurística REA o generación de XML Draw.io directamente dentro de un endpoint cuando se trabaja en estructura modular.
2. **`services/*`** contiene la lógica pura de negocio (Motores REA, FinOps, IAM Scorer, Draw.io AWS4). Los servicios no deben depender de objetos HTTP (`Request` o `UploadFile` crudos; reciben `bytes`, `str` o esquemas Pydantic/modelos).
3. **`models/*`** define las 7 tablas relacionales con soporte híbrido **JSONB** para evidencias técnicas, escenarios REA y grafos de diagramas.

---

## 2. Reglas de Arquitectura AWS (AWS Well-Architected Framework)

Cada arquitectura recomendada o validada por el backend debe cumplir los **6 pilares de AWS Well-Architected** y mapearse en `well_architected_notes`:

1. **Excelencia Operativa (`Operational Excellence`)**:
   - Incluir siempre `CloudWatch` para métricas, logs centralizados y alarmas proactivas de CPU/latencia, más `CloudTrail` en controles de auditoría.
2. **Seguridad (`Security`)**:
   - Aislar bases de datos (`RDS`, `Aurora`, `DynamoDB`, `ElastiCache`) en **Subredes Privadas VPC**.
   - Eliminar credenciales estáticas mediante roles temporales STS (`EC2-MigrationApp-Role`, `RDS-PrivateSubnet-AccessRole`).
   - Cifrado en tránsito (`TLS 1.3` en `CloudFront`/`ALB`) y en reposo (`SSE-KMS` en `S3` y `KMS` CMK).
3. **Fiabilidad (`Reliability`)**:
   - Mapear el nivel de disponibilidad (`availability_level`) seleccionado en la propuesta:
     - `'99.9% (Básico Multi-AZ)'` -> Escenario `Cost-Optimized` o base Multi-AZ.
     - `'99.95% (Alta Disponibilidad)'` -> Escenario `Recommended-Production` (2x `EC2`/`ECS` tras `ALB` Multi-AZ + `RDS` Multi-AZ).
     - `'99.99% (Misión Crítica Multi-Región)'` -> Escenario `High-Availability-Enterprise` (3x-4x instancias, `Aurora`, `ElastiCache`, `WAF`, `Route 53` con health checks).
4. **Eficiencia de Rendimiento (`Performance Efficiency`)**:
   - Si el proyecto contiene `Dockerfile` o `docker-compose.yml` (`has_docker == True`), priorizar `ECS` (Fargate) con patrón `"Microservicios Contenedorizados Multi-AZ"`.
   - Si no usa contenedores, aplicar `"Arquitectura Web Empresarial Multi-Capa (3-Tier High Availability)"` con `EC2` Auto Scaling.
5. **Optimización de Costos (`Cost Optimization`)**:
   - Calcular siempre sobre **730 horas/mes** y recomendar `AWS Compute Savings Plans` (hasta 32% de ahorro) en las notas arquitectónicas.
6. **Sostenibilidad (`Sustainability`)**:
   - Preferir instancias modernas de alta eficiencia energética (`cache.t4g.medium` Graviton, `ECS Fargate` serverless, `Aurora Serverless v2`).

---

## 3. Estándar de Comentarios Arquitectónicos en el Código

Revisa la plantilla detallada en [`references/commenting_and_clean_arch.md`](./references/commenting_and_clean_arch.md). Todo archivo del backend debe incluir:

- **Bloque de Cabecera de Arquitectura**: Explica a qué capa pertenece el archivo, qué patrón implementa y con qué módulo del frontend o tabla de BD conversa.
- **Separadores de Secciones**: Bloques `# ==========================================================`.
- **Comentarios de Decisiones de Diseño (ADR inline)**: Explican *por qué* se tomó una decisión (ej. uso de `JSONB` para `scenarios`, fallback determinista cuando `GEMINI_API_KEY` está vacía, o `valid_window=1` en TOTP).

---

## 4. Verificación Arquitectónica

1. Comprueba que las 7 tablas definidas en [`context_backend/01_MODELO_DATOS_Y_BASE_DE_DATOS.md`](../../../context_backend/01_MODELO_DATOS_Y_BASE_DE_DATOS.md) tengan sus restricciones `CHECK` exactas (`app_type`, `availability_level`, `migration_goal`, `status`, `diagram_type`).
2. Verifica que el endpoint de salud `/api/v1/migration-evaluator/status` responda en menos de 100 ms en los puertos `8080` o `8000` para que el frontend active el indicador **"Motor REA Online"**.

