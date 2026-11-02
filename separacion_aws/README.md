# Cloud Diagnostix — Plataforma de Diagnóstico y Arquitectura AWS

Aplicación web desarrollada en **React 19 + TypeScript + Vite** para la planeación, diagnóstico, simulación de costos, evaluación de seguridad y diseño de arquitecturas en **Amazon Web Services (AWS)**.

## Módulos Principales

1. **Resumen Ejecutivo (`/modules/aws/overview`)**: Indicadores clave (KPIs) de costos, SLA, seguridad y servicios activos.
2. **Planeación Cloud (`/modules/aws/planning`)**: Creación y análisis de propuestas de migración e infraestructura AWS.
3. **Catálogo de Servicios (`/modules/aws/catalog`)**: Explorador interactivo de servicios AWS por categoría.
4. **Arquitectura de Red (`/modules/aws/network`)**:
   - **React Flow (`@xyflow/react`)**: Vista interactiva de nodos para visualizar cómo está estructurado el proyecto normalmente y el flujo de servicios activos.
   - **Draw.io (`react-drawio`)**: Editor embebido de diagrams.net para dibujar y exportar diagramas de arquitectura en AWS (`.drawio`).
5. **Simulador de Costos (`/modules/aws/costs`)**: Estimación detallada de presupuesto mensual y anual en AWS.
6. **Seguridad e IAM (`/modules/aws/security`)**: Evaluación de controles de seguridad y cumplimiento bajo el modelo de responsabilidad compartida.

## Comandos

```bash
# Instalar dependencias
npm install

# Ejecutar servidor de desarrollo
npm run dev

# Compilar para producción
npm run build
```
