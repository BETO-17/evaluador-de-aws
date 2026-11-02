# Estándar de Comentarios Arquitectónicos y Clean Architecture — Cloud Diagnostix

Este documento establece las plantillas obligatorias de comentarios y documentación interna para cada capa del backend de **Cloud Diagnostix**.

---

## 1. Plantilla de Encabezado para Archivos Python (`.py`)

Cada archivo Python que se cree o modifique en `app/` debe comenzar con este encabezado estructurado:

```python
"""
===============================================================================
PROYECTO: Cloud Diagnostix — AWS Cloud Suite Backend
MÓDULO: <ruta_del_archivo, ej. app/services/rea_engine.py>
CAPA ARQUITECTÓNICA: <Core | Models | Schemas | Services | API v1 | MCP>
DESCRIPCIÓN:
    <Explicación concisa de la responsabilidad del módulo y qué problema resuelve>.
INTEGRACIÓN FRONTEND / BD:
    - Frontend: <ej. src/features/modules/aws-cloud/services/analyzerService.ts>
    - Base de Datos: <ej. Tabla proposal_rea_evaluations (JSONB scenarios)>
    - Referencia Contexto: <ej. context_backend/03_MOTOR_REA_E_INTELIGENCIA_ARTIFICIAL.md>
===============================================================================
"""
```

---

## 2. Comentarios de Sección Visuales

Usa divisores uniformes de 58 caracteres (`=`) para organizar cada archivo en bloques legibles:

```python
# ==========================================================
# 1. CONFIGURACIÓN Y CONSTANTES ARQUITECTÓNICAS
# ==========================================================

# ==========================================================
# 2. ESQUEMAS Y CONTRATOS DE DATOS (DTOs)
# ==========================================================

# ==========================================================
# 3. LÓGICA DE DOMINIO / SERVICIOS CORE
# ==========================================================

# ==========================================================
# 4. ENDPOINTS REST (/api/v1/...)
# ==========================================================
```

---

## 3. Comentarios de Decisiones de Arquitectura (ADR Inline)

Cuando implementes una regla crítica del negocio, añade un comentario `# [ADR-REA]` o `# [REGLA DE NEGOCIO]` explicando el motivo:

```python
# [REGLA DE NEGOCIO - IAM SCORER]:
# El control 'ec2Roles' (+20 pts) solo otorga puntaje si el rol está activo
# Y además el servicio 'EC2' forma parte de 'selectedServices' de la propuesta,
# manteniendo paridad 1:1 con el cálculo en AwsPlanning.tsx y AwsReaTechSheetModal.tsx.
if controls.ec2_roles and "EC2" in selected_services:
    score += 20
```

```python
# [ADR-REA - RESILIENCIA ZERO-FAILURE]:
# Si GEMINI_API_KEY no está configurada o la API externa falla, el motor conmuta
# de forma transparente al Motor Heurístico Determinista para garantizar que el
# frontend siempre reciba los 3 escenarios (Cost-Optimized, Recommended-Production,
# High-Availability-Enterprise) sin errores HTTP 500.
```

