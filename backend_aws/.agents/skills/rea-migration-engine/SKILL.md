---
name: rea-migration-engine
description: >-
  Implementa y ejecuta el Motor Evaluador REA (Reasoning & Enterprise Architecture) de
  Cloud Diagnostix, incluyendo el inspector estático de archivos .zip y repositorios
  GitHub, la integración con Google Gemini 2.5 Flash (con fallback heurístico determinista)
  y el cálculo FinOps de los 3 escenarios (Cost-Optimized, Recommended-Production,
  High-Availability-Enterprise). Úsala cuando el usuario pida programar o modificar la
  auditoría de código, la integración con Gemini AI o la calculadora de precios AWS.
---

# Skill: Motor Evaluador REA e Inteligencia Artificial (`rea-migration-engine`)

Esta skill define la implementación completa del **Motor REA (Reasoning & Enterprise Architecture)** descrito en [`context_backend/03_MOTOR_REA_E_INTELIGENCIA_ARTIFICIAL.md`](../../../context_backend/03_MOTOR_REA_E_INTELIGENCIA_ARTIFICIAL.md).

---

## 1. Pipeline de 4 Fases del Motor REA

El motor debe estructurarse en 4 etapas secuenciales claramente comentadas en el código:

1. **Fase 1 — Inspector Estático de Código (`app/services/project_inspector.py`)**:
   - Recibe un flujo de bytes `.zip` (hasta 50 MB en memoria con `zipfile.ZipFile(io.BytesIO(zip_bytes))`) o metadatos de un repositorio de GitHub (`repo_url`, `github_token`).
   - Ignora obligatoriamente: `node_modules/`, `.git/`, `venv/`, `dist/`, `__pycache__/`.
   - Detecta archivos de configuración (`package.json`, `requirements.txt`, `pyproject.toml`, `Dockerfile`, `docker-compose.yml`, `pom.xml`, `.env.example`).
   - Inspecciona archivos de configuración menores a `250 KB` para extraer:
     - `languages`: `TypeScript`, `JavaScript`, `Python`, `Java`, `SQL`.
     - `frameworks`: `React`, `Next.js`, `Node.js API` (`express`/`nestjs`/`fastify`), `FastAPI`, `Django`, `Flask`.
     - `databases`: `PostgreSQL (Amazon RDS)`, `MySQL (Amazon RDS)`, `NoSQL (Amazon DynamoDB)`, `Redis (Amazon ElastiCache)`.
     - `has_docker`: `True` si existe `Dockerfile` o `docker-compose.yml`.
     - `total_files`: conteo total de archivos válidos inspeccionados.

2. **Fase 2 — Motor IA Gemini 2.5 Flash + Fallback Heurístico (`app/services/rea_engine.py`)**:
   - Si `GEMINI_API_KEY` está presente, invoca `google-genai` con el modelo `gemini-2.5-flash` y `response_mime_type="application/json"` usando el System Prompt oficial de [`references/aws_rea_catalog_and_prompt.md`](./references/aws_rea_catalog_and_prompt.md).
   - **Garantía Zero-Failure**: Envuelve siempre la llamada a Gemini en un bloque `try / except`. Si no hay `GEMINI_API_KEY`, se agota el tiempo de espera o la respuesta no cumple el esquema, ejecuta inmediatamente el **Motor Heurístico Determinista** (`build_rea_evaluation`) para devolver el contrato `EnterpriseEvaluationResponse` sin fallar jamás.

3. **Fase 3 — Calculadora FinOps AWS (`app/services/pricing_calculator.py`)**:
   - Utiliza exclusivamente los **19 códigos oficiales del catálogo AWS** definidos en [`references/aws_rea_catalog_and_prompt.md`](./references/aws_rea_catalog_and_prompt.md):
     `["Route 53", "CloudFront", "WAF", "ALB", "VPC", "EC2", "ECS", "Lambda", "RDS", "Aurora", "DynamoDB", "ElastiCache", "S3", "SQS", "SNS", "IAM", "SecretsManager", "KMS", "CloudWatch"]`.
   - Aplica multiplicadores según `traffic_tier`:
     - `low` (`<25k req/mes`): Factor `0.68x` (`0.7x`), `1x` instancia de cómputo.
     - `medium` (`100k - 500k req/mes`): Factor `1.00x`, `2x` instancias Multi-AZ.
     - `high` (`>1M req/mes`): Factor `1.45x` (`1.4x`), `3x` instancias + caché Redis.
     - `enterprise` (`Misión Crítica`): Factor `1.85x` (`1.8x`), `4x` instancias + Aurora + WAF + KMS.
   - Calcula siempre `monthly_total_usd` y `annual_total_usd = round(monthly_total_usd * 12, 2)` en moneda `"USD"`.

4. **Fase 4 — Ensamblaje de los 3 Escenarios Obligatorios**:
   El arreglo `scenarios` de `EnterpriseEvaluationResponse` debe contener siempre exactamente estos 3 objetos en orden:
   - `"Cost-Optimized"`: Configuración económica de entrada (`Route 53`, `VPC`, `EC2`, `RDS`, `S3`, `IAM`) con factor `0.68 * tier_multiplier` y `1` instancia de cómputo.
   - `"Recommended-Production"`: Balance Multi-AZ recomendado por REA (`Route 53`, `CloudFront`, `ALB`, `VPC`, `ECS`/`EC2`, `RDS`/`DynamoDB`, `ElastiCache` si aplica, `S3`, `IAM`, `CloudWatch`) con factor `1.0 * tier_multiplier` y `2` instancias de cómputo.
   - `"High-Availability-Enterprise"`: Misión crítica extendida sumando `WAF`, `Aurora`, `ElastiCache`, `KMS` y `SecretsManager` con factor `1.35 * tier_multiplier` y `3` instancias de cómputo.

---

## 2. Reglas de Comentarios en el Motor REA

Cada archivo del motor REA debe incluir comentarios detallados:
- En `project_inspector.py`: Comentar cada regla de detección de archivos y por qué se limita la lectura en memoria a archivos de configuración `< 250_000 bytes` (protección contra ataques Zip Bomb y uso excesivo de RAM).
- En `rea_engine.py`: Comentar la lógica de selección entre `ECS` (cuando `has_docker == True`) y `EC2`, la selección entre `DynamoDB` y `RDS`, y el mecanismo de conmutación (`fallback`) entre Gemini 2.5 Flash y el motor determinista.
- En `pricing_calculator.py`: Documentar en cada entrada del diccionario `AWS_REA_CATALOG` el rol arquitectónico, las especificaciones técnicas (`specs`) y el costo base mensual sobre `730 horas/mes`.

