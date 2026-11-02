# 04. Seguridad IAM, Autenticación TOTP (2FA) y Diagramas AWS4

Este documento especifica las reglas de negocio del backend para:
1. **Autenticación de Doble Factor con TOTP (RFC 6238)** compatible con [`AwsLogin.tsx`](../src/features/modules/aws-cloud/pages/AwsLogin.tsx).
2. **Evaluación de Seguridad IAM por Proyecto de Migración (0 a 100 pts)** compatible con [`AwsPlanning.tsx`](../src/features/modules/aws-cloud/pages/AwsPlanning.tsx) y [`AwsReaTechSheetModal.tsx`](../src/features/modules/aws-cloud/components/AwsReaTechSheetModal.tsx).
3. **Generación de Diagramas de Arquitectura en Draw.io con Iconos Oficiales AWS4 (`mxgraph.aws4`)** compatible con [`AwsDrawioEditor.tsx`](../src/features/modules/aws-cloud/components/AwsDrawioEditor.tsx).

---

## 1. Autenticación TOTP (RFC 6238 — Ventana de 30 Segundos)

El login de **Cloud Diagnostix** exige un segundo factor de autenticación mediante un código numérico de **6 dígitos** rotativo cada 30 segundos (algoritmo **HMAC-SHA1** sobre clave en Base32).

### Configuración Compatible con Frontend (`AwsLogin.tsx`):
- **Clave Secreta Base32 por defecto (Demo / Desarrollo)**: `JBSWY3DPEHPK3PXP`
- **Intervalo (`step`)**: `30` segundos
- **Dígitos**: `6`
- **Algoritmo**: `SHA1`
- **Tolerancia de reloj (`valid_window`)**: `1` (acepta la ventana actual y $\pm 1$ ventana de 30s para evitar rechazos por desfase de milisegundos entre cliente y servidor).

### Ejemplo de Verificación con `pyotp` en el Backend:
```python
import pyotp

def verify_totp_code(secret_base32: str, code: str) -> bool:
    totp = pyotp.TOTP(secret_base32, digits=6, interval=30)
    return totp.verify(code.strip(), valid_window=1)

def get_provisioning_uri(email: str, secret_base32: str) -> str:
    totp = pyotp.TOTP(secret_base32, digits=6, interval=30)
    return totp.provisioning_uri(name=email, issuer_name="Cloud Diagnostix AWS")
```

---

## 2. Motor de Evaluación de Seguridad e IAM por Migración (`0 - 100 pts`)

Cada propuesta de migración registrada tiene su propia matriz de **6 controles de seguridad e identidad IAM**. El backend calcula el puntaje exacto con la misma fórmula que el frontend:

| Clave del Control (`key`) | Título del Control | Servicio AWS Asociado | Puntos | Condición de Puntaje |
| :--- | :--- | :--- | :---: | :--- |
| `rootBlocked` | Cuenta Root Protegida | `AWS IAM / Root Guard` | **20 pts** | Suma `+20` si `rootBlocked == True` |
| `mfaEnforced` | MFA Obligatorio en IAM | `AWS IAM MFA / TOTP` | **20 pts** | Suma `+20` si `mfaEnforced == True` |
| `ec2Roles` | Roles de Instancia (EC2 STS) | `AWS STS / IAM Roles` | **20 pts** | Suma `+20` si `ec2Roles == True` **y** `EC2` está en `selectedServices` |
| `tls13` | Cifrado en Tránsito TLS 1.3 | `AWS Certificate Manager (ACM)` | **15 pts** | Suma `+15` si `tls13 == True` |
| `s3EncryptionAndVersioning` | Cifrado SSE-KMS y Versionado S3 | `Amazon S3 + AWS KMS` | **15 pts** | Suma `+15` si `s3EncryptionAndVersioning == True` **y** `S3` está en `selectedServices` |
| `complianceAudits` | Auditoría Inmutable CloudTrail | `AWS CloudTrail + CloudWatch` | **10 pts** | Suma `+10` si `complianceAudits == True` |

### Clasificación de Postura de Seguridad (`posture_label`):
- **`80 a 100 pts`** -> `"Postura Robusta"` (Verde `#16a34a`)
- **`40 a 79 pts`** -> `"Postura Aceptable"` (Ámbar `#d97706`)
- **`0 a 39 pts`** -> `"Postura Crítica"` (Rojo `#dc2626`)

### Roles IAM Recomendados por Defecto en la Ficha Técnica:
1. `EC2-MigrationApp-Role (STS Least Privilege)`
2. `RDS-PrivateSubnet-AccessRole`
3. `S3-KMS-EncryptedBucket-Policy`
4. `CloudTrail-SecurityAudit-ReadOnlyRole`

---

## 3. Estándar de Stencils Oficiales AWS4 para Draw.io (`mxgraph.aws4`)

Cuando el backend o el frontend construyen el archivo XML de Draw.io para cualquier sistema evaluado por REA, deben usar los **stencils nativos `mxgraph.aws4`** para que Draw.io dibuje los iconos oficiales de Amazon Web Services organizados por capas arquitectónicas:

### 3.1. Contenedores de Grupo Oficiales (`shape=mxgraph.aws4.group`)
- **Contenedor AWS Cloud**: `grIcon=mxgraph.aws4.group_aws_cloud_alt;strokeColor=#232F3E;`
- **Contenedor Región AWS**: `grIcon=mxgraph.aws4.group_region;strokeColor=#00A4A6;dashed=1;`
- **Contenedor Amazon VPC**: `grIcon=mxgraph.aws4.group_vpc2;strokeColor=#8C4FFF;`
- **Subredes Públicas / Privadas y Gobierno IAM**: `grIcon=mxgraph.aws4.group_security_group;`

### 3.2. Mapa de Iconos de Servicios (`shape=mxgraph.aws4.resourceIcon`)

| Servicio (`service_code`) | Capa en el Diagrama (`tier`) | `resIcon` Oficial en Draw.io (`mxgraph.aws4.*`) | Color Oficial (`fillColor`) |
| :--- | :--- | :--- | :---: |
| **Clientes / Usuarios** | Entrada Externa | `shape=mxgraph.aws4.users` | `#232F3E` |
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

