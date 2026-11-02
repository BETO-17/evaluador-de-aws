# Catálogo Oficial de Stencils `mxgraph.aws4` para Draw.io — Cloud Diagnostix

---

## 1. Mapa Oficial de Iconos por Servicio y Capa (`shape=mxgraph.aws4.resourceIcon`)

| Servicio (`service_code`) | Capa Arquitectónica (`tier`) | `resIcon` Oficial (`mxgraph.aws4.*`) | Color Oficial (`fillColor`) |
| :--- | :--- | :--- | :---: |
| **Clientes / Usuarios** | 0. Entrada Externa | `shape=mxgraph.aws4.users` | `#232F3E` |
| **`Route 53`** | 1. Perímetro Global Edge | `mxgraph.aws4.route_53` | `#8C4FFF` |
| **`CloudFront`** | 1. Perímetro Global Edge | `mxgraph.aws4.cloudfront` | `#8C4FFF` |
| **`WAF`** | 1. Perímetro Global Edge | `mxgraph.aws4.waf` | `#DD344C` |
| **`ALB`** | 2. Subred Pública (Ingress) | `mxgraph.aws4.elastic_load_balancing` | `#8C4FFF` |
| **`API Gateway`** | 2. Subred Pública (Ingress) | `mxgraph.aws4.api_gateway` | `#8C4FFF` |
| **`VPC`** | 2. Subred Pública / Contenedor | `mxgraph.aws4.vpc` | `#8C4FFF` |
| **`EC2`** | 3. Subred Privada App (Cómputo) | `mxgraph.aws4.ec2` | `#ED7100` |
| **`ECS`** | 3. Subred Privada App (Cómputo) | `mxgraph.aws4.ecs` | `#ED7100` |
| **`EKS`** | 3. Subred Privada App (Cómputo) | `mxgraph.aws4.eks` | `#ED7100` |
| **`Lambda`** | 3. Subred Privada App (Cómputo) | `mxgraph.aws4.lambda` | `#ED7100` |
| **`SQS`** | 3. Subred Privada App (Eventos) | `mxgraph.aws4.sqs` | `#E7157B` |
| **`SNS`** | 3. Subred Privada App (Eventos) | `mxgraph.aws4.sns` | `#E7157B` |
| **`RDS`** | 4. Subred Privada Datos | `mxgraph.aws4.rds` | `#3B48CC` |
| **`Aurora`** | 4. Subred Privada Datos | `mxgraph.aws4.aurora` | `#3B48CC` |
| **`DynamoDB`** | 4. Subred Privada Datos | `mxgraph.aws4.dynamodb` | `#3B48CC` |
| **`ElastiCache`** | 4. Subred Privada Datos | `mxgraph.aws4.elasticache` | `#3B48CC` |
| **`S3`** | 4. Subred Privada Datos / Storage | `mxgraph.aws4.s3` | `#3F8624` |
| **`IAM`** | 5. Gobierno de Seguridad e Identidad | `mxgraph.aws4.identity_and_access_management` | `#DD344C` |
| **`SecretsManager`** | 5. Gobierno de Seguridad e Identidad | `mxgraph.aws4.secrets_manager` | `#DD344C` |
| **`KMS`** | 5. Gobierno de Seguridad e Identidad | `mxgraph.aws4.key_management_service` | `#DD344C` |
| **`CloudWatch`** | 5. Gobierno de Seguridad y Monitoreo | `mxgraph.aws4.cloudwatch` | `#E7157B` |

---

## 2. Plantilla de Estilo para Icono de Recurso (`mxCell`)

```xml
<mxCell id="node_EC2" value="Amazon EC2&#xa;(Auto Scaling Multi-AZ)"
  style="sketch=0;points=[[0,0,0],[0.25,0,0],[0.5,0,0],[0.75,0,0],[1,0,0],[0,1,0],[0.25,1,0],[0.5,1,0],[0.75,1,0],[1,1,0],[0,0.25,0],[0,0.5,0],[0,0.75,0],[1,0.25,0],[1,0.5,0],[1,0.75,0]];outlineConnect=0;fontColor=#232F3E;gradientColor=none;fillColor=#ED7100;strokeColor=#ffffff;dashed=0;verticalLabelPosition=bottom;verticalAlign=top;align=center;html=1;fontSize=11;fontStyle=1;aspect=fixed;shape=mxgraph.aws4.resourceIcon;resIcon=mxgraph.aws4.ec2;"
  vertex="1" parent="tier_compute">
  <mxGeometry x="60" y="55" width="60" height="60" as="geometry" />
</mxCell>
```

