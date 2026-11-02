---
name: drawio-aws4-mcp
description: >-
  Genera, valida y exporta diagramas de arquitectura AWS en formato XML de Draw.io (.drawio)
  usando stencils oficiales mxgraph.aws4, y configura o ejecuta el servidor MCP de Draw.io
  para Cloud Diagnostix. Úsala cuando el usuario pida crear diagramas de arquitectura AWS4,
  implementar drawio_aws4_builder.py, exponer los endpoints /api/v1/proposals/{id}/diagrams/drawio
  o configurar/usar el MCP de Draw.io.
---

# Skill: Servidor MCP de Draw.io y Generador de Diagramas AWS4 (`drawio-aws4-mcp`)

Esta skill proporciona las reglas de construcción de diagramas `.drawio` con stencils oficiales `mxgraph.aws4` (compatibles con `AwsDrawioEditor.tsx`) y el **Servidor MCP de Draw.io** listo para integrarse en Antigravity o invocarse desde el backend FastAPI.

---

## 1. Arquitectura de Capas y Contenedores `mxgraph.aws4`

Todo diagrama `.drawio` generado por el backend (`app/services/drawio_aws4_builder.py`) o por el servidor MCP debe organizar los recursos en **contenedores jerárquicos oficiales AWS4** y **5 capas arquitectónicas (`tiers`)**:

### 1.1. Contenedores de Grupo Oficiales (`shape=mxgraph.aws4.group`)
1. **Contenedor AWS Cloud**:
   `points=[[0,0],[0.25,0],[0.5,0],[0.75,0],[1,0],[1,0.25],[1,0.5],[1,0.75],[1,1],[0.75,1],[0.5,1],[0.25,1],[0,1],[0,0.75],[0,0.5],[0,0.25]];outlineConnect=0;gradientColor=none;html=1;whiteSpace=wrap;fontSize=12;fontStyle=1;container=1;pointerEvents=0;collapsible=0;recursiveResize=0;shape=mxgraph.aws4.group;grIcon=mxgraph.aws4.group_aws_cloud_alt;strokeColor=#232F3E;fillColor=none;verticalAlign=top;align=left;spacingLeft=30;fontColor=#232F3E;dashed=0;`
2. **Contenedor Región AWS (`sa-east-1`, `us-east-1`, etc.)**:
   `...;shape=mxgraph.aws4.group;grIcon=mxgraph.aws4.group_region;strokeColor=#00A4A6;fillColor=none;fontColor=#147EBA;dashed=1;`
3. **Contenedor Amazon VPC (`/16`)**:
   `...;shape=mxgraph.aws4.group;grIcon=mxgraph.aws4.group_vpc2;strokeColor=#8C4FFF;fillColor=none;fontColor=#8C4FFF;dashed=0;`
4. **Contenedores de Subred / Gobierno IAM**:
   `...;shape=mxgraph.aws4.group;grIcon=mxgraph.aws4.group_security_group;strokeColor=#00A4A6;fillColor=#F2F8FD;` (o `#FEF6F6` para el bloque de Gobierno IAM).

### 1.2. Las 5 Capas Arquitectónicas (`Tiers`) de Cloud Diagnostix
1. **Entrada Externa**: Nodo `Clientes / Usuarios` (`shape=mxgraph.aws4.users`, `fillColor=#232F3E`).
2. **Tier 1 — Perímetro Global Edge**: `Route 53`, `CloudFront`, `WAF`.
3. **Tier 2 — Subred Pública (Ingress)**: `ALB`, `API Gateway`, `VPC`.
4. **Tier 3 — Subred Privada App (Cómputo y Eventos)**: `EC2`, `ECS`, `EKS`, `Lambda`, `SQS`, `SNS`.
5. **Tier 4 — Subred Privada Datos y Almacenamiento**: `RDS`, `Aurora`, `DynamoDB`, `ElastiCache`, `S3`.
6. **Tier 5 — Gobierno de Seguridad, Identidad y Monitoreo**: `IAM`, `SecretsManager`, `KMS`, `CloudWatch`.

Consulta la tabla completa de iconos `resIcon` y colores `fillColor` en [`references/mxgraph_aws4_stencils.md`](./references/mxgraph_aws4_stencils.md).

---

## 2. Servidor MCP de Draw.io Incluido (`scripts/drawio_aws4_mcp_server.py`)

Esta skill incluye un servidor **Model Context Protocol (MCP)** autocontenido sobre transporte `stdio` en:
[`scripts/drawio_aws4_mcp_server.py`](./scripts/drawio_aws4_mcp_server.py)

### Herramientas MCP Expuestas por el Servidor:
1. **`generate_aws4_drawio_xml`**:
   - Recibe `proposal_name`, `region`, `selected_services` (lista de códigos AWS del catálogo REA) y opcionalmente `output_path`.
   - Devuelve el documento XML `<mxfile>` completo con los contenedores oficiales `mxgraph.aws4`, todos los iconos posicionados por capa y las flechas de flujo de red etiquetadas (`HTTPS TLS 1.3`, ` Tráfico Balanceado Multi-AZ`, `Consultas SQL/TCP`, etc.).
2. **`save_drawio_diagram_file`**:
   - Genera y guarda directamente un archivo `.drawio` en el disco del proyecto.
3. **`list_aws4_stencils_catalog`**:
   - Devuelve el catálogo oficial de los 19+ servicios AWS con su `service_code`, `tier`, `resIcon` (`mxgraph.aws4.*`) y `fillColor`.
4. **`validate_drawio_aws4_xml`**:
   - Inspecciona un XML de Draw.io para verificar que tenga estructura `<mxfile><diagram><mxGraphModel><root>`, contenedores `mxgraph.aws4.group` e iconos `mxgraph.aws4.resourceIcon`.

### Cómo Registrar el Servidor MCP en Antigravity (`mcp_config.json`)
Para habilitar las herramientas MCP de Draw.io globalmente o en el entorno, registra el servidor en `C:\Users\luisa\.gemini\config\mcp_config.json` (o úsalo directamente desde Python en `app/services/drawio_aws4_builder.py`):

```json
{
  "mcpServers": {
    "clouddiagnostix-drawio-aws4": {
      "command": "python",
      "args": [
        "c:/Users/luisa/Documents/PS6/aws_proyecto/backend_aws/.agents/skills/drawio-aws4-mcp/scripts/drawio_aws4_mcp_server.py"
      ],
      "env": {
        "PYTHONIOENCODING": "utf-8"
      }
    }
  }
}
```

También es compatible con el servidor MCP interactivo de comunidad `@drawio/mcp` (vía `npx -y @drawio/mcp` si se requiere puente con el navegador).

---

## 3. Endpoints REST de Diagramas en FastAPI (`app/api/v1/endpoints/diagrams.py`)

El backend debe exponer los 2 endpoints definidos en [`context_backend/02_CONTRATOS_API_REST_ENDPOINTS.md`](../../../context_backend/02_CONTRATOS_API_REST_ENDPOINTS.md):

1. **`GET /api/v1/proposals/{id}/diagrams/drawio`**:
   - Si la propuesta ya tiene un XML personalizado guardado en la tabla `architecture_diagrams` (`diagram_type = 'drawio_aws4'`), lo devuelve.
   - Si no existe aún, invoca `build_aws4_drawio_xml(...)` pasando `solution_name`, `region` y `selected_services` de la propuesta para generarlo dinámicamente.
2. **`PUT /api/v1/proposals/{id}/diagrams/drawio`**:
   - Recibe el XML editado manualmente por el usuario en `AwsDrawioEditor.tsx`, valida su estructura básica y actualiza (`UPSERT`) el registro en `architecture_diagrams`.

---

## 4. Reglas de Comentarios en Generación de Diagramas y MCP

- Documenta con comentarios inline las coordenadas geométricas (`x`, `y`, `width`, `height`) de cada contenedor (`AWS Cloud`, `Region`, `VPC`, `Tiers`) para que cualquier desarrollador pueda ajustar el layout sin solapar nodos.
- En cada nodo `mxCell`, comenta qué estilo (`style`) corresponde a `shape=mxgraph.aws4.resourceIcon` y por qué `vertex="1"` o `edge="1"` y `parent="<id_contenedor>"` establecen la jerarquía visual en Draw.io.

