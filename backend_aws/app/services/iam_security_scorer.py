"""
===============================================================================
PROYECTO: Cloud Diagnostix — AWS Cloud Suite Backend
MÓDULO: app/services/iam_security_scorer.py
CAPA ARQUITECTÓNICA: Services (Fase 4 del Motor REA — Evaluador de Seguridad IAM)
DESCRIPCIÓN:
    Calcula el puntaje exacto de postura de seguridad e identidad IAM (0 a 100 pts)
    para cada propuesta de migración en función de sus 6 controles y de los
    servicios AWS seleccionados (`EC2` y `S3`).
INTEGRACIÓN FRONTEND / BD:
    - Frontend: AwsPlanning.tsx y AwsReaTechSheetModal.tsx
    - Base de Datos: Tabla `proposal_security_controls`
    - Referencia Contexto: context_backend/04_SEGURIDAD_IAM_TOTP_Y_DIAGRAMAS_AWS4.md
===============================================================================
"""

from typing import Any, Dict, List, Optional


# ==========================================================
# 1. ROLES IAM DE MÍNIMO PRIVILEGIO RECOMENDADOS POR DEFECTO
# ==========================================================
DEFAULT_RECOMMENDED_IAM_ROLES: List[str] = [
    "EC2-MigrationApp-Role (STS Least Privilege)",
    "RDS-PrivateSubnet-AccessRole",
    "S3-KMS-EncryptedBucket-Policy",
    "CloudTrail-SecurityAudit-ReadOnlyRole",
]


# ==========================================================
# 2. MOTOR DE CALIFICACIÓN DE POSTURA IAM (0 A 100 PUNTOS)
# ==========================================================
def evaluate_iam_security_controls(
    controls: Dict[str, Any],
    selected_services: Optional[List[str]] = None,
) -> Dict[str, Any]:
    """
    Calcula el puntaje de postura de seguridad IAM (`0 - 100 pts`) aplicando la
    fórmula exacta de Cloud Diagnostix:

    - `rootBlocked` (`AWS IAM / Root Guard`): +20 pts si es True.
    - `mfaEnforced` (`AWS IAM MFA / TOTP`): +20 pts si es True.
    - `ec2Roles` (`AWS STS / IAM Roles`): +20 pts si es True Y `EC2` está en `selected_services`.
    - `tls13` (`AWS Certificate Manager ACM`): +15 pts si es True.
    - `s3EncryptionAndVersioning` (`Amazon S3 + KMS`): +15 pts si es True Y `S3` está en `selected_services`.
    - `complianceAudits` (`AWS CloudTrail + CloudWatch`): +10 pts si es True.

    Clasificación (`posture_label`):
    - `80 a 100 pts` -> `"Postura Robusta"`
    - `40 a 79 pts`  -> `"Postura Aceptable"`
    - `0 a 39 pts`   -> `"Postura Crítica"`
    """
    if selected_services is None:
        # Si no se especifican servicios al evaluar, se asume que EC2 y S3 están presentes
        normalized_services = {"EC2", "S3"}
    else:
        normalized_services = {str(s).strip().upper() for s in selected_services}

    root_blocked = bool(controls.get("rootBlocked", controls.get("root_blocked", True)))
    mfa_enforced = bool(controls.get("mfaEnforced", controls.get("mfa_enforced", True)))
    ec2_roles = bool(controls.get("ec2Roles", controls.get("ec2_roles", True)))
    tls_13 = bool(controls.get("tls13", controls.get("tls_13", True)))
    s3_enc = bool(
        controls.get(
            "s3EncryptionAndVersioning",
            controls.get("s3_encryption_and_versioning", True),
        )
    )
    compliance_audits = bool(
        controls.get("complianceAudits", controls.get("compliance_audits", True))
    )

    score = 0

    # 1. Cuenta Root Protegida (+20 pts)
    if root_blocked:
        score += 20

    # 2. MFA Obligatorio en IAM (+20 pts)
    if mfa_enforced:
        score += 20

    # 3. Roles de Instancia EC2 STS (+20 pts condicionado a que EC2 esté en selected_services)
    if ec2_roles and "EC2" in normalized_services:
        score += 20

    # 4. Cifrado en Tránsito TLS 1.3 (+15 pts)
    if tls_13:
        score += 15

    # 5. Cifrado SSE-KMS y Versionado S3 (+15 pts condicionado a que S3 esté en selected_services)
    if s3_enc and "S3" in normalized_services:
        score += 15

    # 6. Auditoría Inmutable CloudTrail (+10 pts)
    if compliance_audits:
        score += 10

    # Etiqueta de postura según rango oficial (04_SEGURIDAD_IAM_TOTP_Y_DIAGRAMAS_AWS4.md)
    if score >= 80:
        posture_label = "Postura Robusta"
    elif score >= 40:
        posture_label = "Postura Aceptable"
    else:
        posture_label = "Postura Crítica"

    return {
        "rootBlocked": root_blocked,
        "mfaEnforced": mfa_enforced,
        "ec2Roles": ec2_roles,
        "tls13": tls_13,
        "s3EncryptionAndVersioning": s3_enc,
        "complianceAudits": compliance_audits,
        "security_score": score,
        "posture_label": posture_label,
        "recommended_iam_roles": DEFAULT_RECOMMENDED_IAM_ROLES,
    }

