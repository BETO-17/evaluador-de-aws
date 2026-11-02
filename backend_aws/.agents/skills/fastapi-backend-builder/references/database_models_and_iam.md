# Referencia de Modelos SQLAlchemy 2.0 y Seguridad IAM — Cloud Diagnostix

---

## 1. Restricciones Exactas de Dominio (`CHECK Constraints`)

Al implementar los modelos SQLAlchemy o validadores Pydantic para `cloud_proposals`, respeta estrictamente estos valores permitidos por el esquema PostgreSQL:

- **`app_type`**:
  - `'E-commerce & Retail'`
  - `'API REST / Backend'`
  - `'Microservicios Cloud'`
  - `'Data Lake & Analítica'`
  - `'Portal Web Empresarial'`
- **`availability_level`**:
  - `'99.9% (Básico Multi-AZ)'`
  - `'99.95% (Alta Disponibilidad)'`
  - `'99.99% (Misión Crítica Multi-Región)'`
- **`migration_goal`**:
  - `'Modernización de Aplicación'`
  - `'Reducción de Costos'`
  - `'Escalabilidad Elástica'`
  - `'Continuidad de Negocio y DR'`
- **`status`**:
  - `'Aprobada'`
  - `'En Revisión'`
  - `'Borrador'`
  - `'Rechazada'`
  - `'Requiere Ajustes'`
- **`diagram_type`** (en `architecture_diagrams`):
  - `'drawio_aws4'`
  - `'reactflow'`

---

## 2. Implementación Comentada del Evaluador de Seguridad IAM (`iam_security_scorer.py`)

```python
from typing import Dict, Any, List


def calculate_iam_security_posture(
    controls: Dict[str, bool],
    selected_services: List[str],
) -> Dict[str, Any]:
    """
    Calcula el puntaje de postura de seguridad IAM (0 a 100 pts) para una propuesta
    de migración AWS, manteniendo paridad exacta con AwsPlanning.tsx.

    Reglas de puntuación:
    - rootBlocked (20 pts): Cuenta Root protegida sin claves de acceso activas.
    - mfaEnforced (20 pts): MFA TOTP obligatorio en usuarios IAM.
    - ec2Roles (20 pts): Roles STS para EC2 (solo suma si 'EC2' está en selected_services).
    - tls13 (15 pts): Cifrado en tránsito TLS 1.3 con AWS ACM.
    - s3EncryptionAndVersioning (15 pts): SSE-KMS + Versionado S3 (solo suma si 'S3' está en selected_services).
    - complianceAudits (10 pts): Trazabilidad inmutable con AWS CloudTrail + CloudWatch.
    """
    score = 0
    normalized_services = {s.upper() for s in selected_services}

    # 1. Cuenta Root Protegida (+20 pts)
    if controls.get("rootBlocked", controls.get("root_blocked", True)):
        score += 20

    # 2. MFA Obligatorio en IAM (+20 pts)
    if controls.get("mfaEnforced", controls.get("mfa_enforced", True)):
        score += 20

    # 3. Roles de Instancia EC2 STS (+20 pts, condicionado a presencia de EC2)
    if controls.get("ec2Roles", controls.get("ec2_roles", True)) and "EC2" in normalized_services:
        score += 20

    # 4. Cifrado en Tránsito TLS 1.3 (+15 pts)
    if controls.get("tls13", controls.get("tls_13", True)):
        score += 15

    # 5. Cifrado SSE-KMS y Versionado S3 (+15 pts, condicionado a presencia de S3)
    s3_ctrl = controls.get("s3EncryptionAndVersioning", controls.get("s3_encryption_and_versioning", True))
    if s3_ctrl and "S3" in normalized_services:
        score += 15

    # 6. Auditoría Inmutable CloudTrail (+10 pts)
    if controls.get("complianceAudits", controls.get("compliance_audits", True)):
        score += 10

    # Clasificación semántica de la postura de seguridad
    if score >= 80:
        posture_label = "Postura Robusta"
    elif score >= 40:
        posture_label = "Postura Aceptable"
    else:
        posture_label = "Postura Crítica"

    return {
        "security_score": score,
        "posture_label": posture_label,
        "recommended_iam_roles": [
            "EC2-MigrationApp-Role (STS Least Privilege)",
            "RDS-PrivateSubnet-AccessRole",
            "S3-KMS-EncryptedBucket-Policy",
            "CloudTrail-SecurityAudit-ReadOnlyRole",
        ],
    }
```

