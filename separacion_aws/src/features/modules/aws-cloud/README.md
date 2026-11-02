# Módulo AWS Cloud — Cloud Diagnostix

Este directorio contiene los componentes, páginas, contexto y datos de **Cloud Diagnostix**:

- `pages/AwsOverview.tsx`: Dashboard ejecutivo.
- `pages/AwsPlanning.tsx`: Planeación de propuestas y analizador de proyectos.
- `pages/AwsCatalog.tsx`: Catálogo de servicios AWS.
- `pages/AwsNetwork.tsx`: Módulo limpio de **Arquitectura de Red** con integración dual:
  - `components/AwsReactFlowView.tsx` (`@xyflow/react`): Visualización interactiva de cómo está estructurado el proyecto normalmente.
  - `components/AwsDrawioEditor.tsx` (`react-drawio`): Lienzo interactivo de Draw.io para dibujar la arquitectura en AWS.
- `pages/AwsCosts.tsx`: Simulador de costos mensuales y anuales.
- `pages/AwsSecurity.tsx`: Auditoría y controles de seguridad IAM.
