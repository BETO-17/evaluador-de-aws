"""
===============================================================================
PROYECTO: Cloud Diagnostix — AWS Cloud Suite Backend
MÓDULO: app/services/pdf_tech_sheet.py
CAPA ARQUITECTÓNICA: Services (Generador de Ficha Técnica REA en PDF A4)
DESCRIPCIÓN:
    Construye en memoria un archivo binario PDF A4 válido (`%PDF-1.4`) con el
    resumen ejecutivo de la propuesta cloud, la Ficha Técnica del Motor REA,
    los 3 escenarios de costos FinOps y la matriz de seguridad IAM (0-100 pts),
    sin requerir librerías nativas externas de sistema operativo.
INTEGRACIÓN FRONTEND / BD:
    - Frontend: Descarga de Ficha Técnica en AwsReaTechSheetModal.tsx
    - Endpoint: `GET /api/v1/proposals/{id}/tech-sheet/pdf`
    - Referencia Contexto: context_backend/02_CONTRATOS_API_REST_ENDPOINTS.md
===============================================================================
"""

from datetime import datetime, timezone
from textwrap import wrap
from typing import Any, Dict, List


# ==========================================================
# 1. GENERADOR PURO EN MEMORIA DE DOCUMENTO PDF A4 (%PDF-1.4)
# ==========================================================
def _escape_pdf_text(text: str) -> str:
    """Normaliza caracteres especiales a Latin-1 seguro y escapa paréntesis PDF."""
    safe = (
        text.replace("\\", "\\\\")
        .replace("(", "\\(")
        .replace(")", "\\)")
        .replace("·", "-")
        .replace("—", "-")
    )
    return safe.encode("latin-1", errors="replace").decode("latin-1")


def generate_rea_tech_sheet_pdf(
    proposal_data: Dict[str, Any],
    rea_data: Dict[str, Any],
    security_data: Dict[str, Any],
) -> bytes:
    """
    Genera los bytes de un documento PDF A4 estándar (`595 x 842 pt`) con el
    reporte oficial de la Ficha Técnica REA y Postura de Seguridad IAM.
    """
    lines: List[str] = [
        "CLOUD DIAGNOSTIX - AWS CLOUD SUITE",
        "FICHA TECNICA DE ARQUITECTURA REA & SEGURIDAD IAM",
        "======================================================================",
        f"Fecha de Emision: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')}",
        f"Propuesta ID:     {proposal_data.get('id', 'N/A')}",
        f"Solucion Cloud:   {proposal_data.get('solution_name', 'Propuesta AWS')}",
        f"Tipo de App:      {proposal_data.get('app_type', 'API REST / Backend')}",
        f"Region AWS:       {proposal_data.get('region', 'sa-east-1')}",
        f"Nivel SLA:        {proposal_data.get('availability_level', '99.95% (Alta Disponibilidad)')}",
        f"Meta Migracion:   {proposal_data.get('migration_goal', 'Modernizacion de Aplicacion')}",
        f"Presupuesto Mes:  USD ${proposal_data.get('monthly_budget', 0.0):.2f} / mes",
        f"Presupuesto Anual:USD ${proposal_data.get('annual_budget', 0.0):.2f} / anio",
        "----------------------------------------------------------------------",
        "1. DICTAMEN DEL MOTOR EVALUADOR REA",
        f"Origen Detectado: {rea_data.get('origin_detected', 'Proyecto Auditado')}",
        f"Patron AWS:       {rea_data.get('architecture_pattern', '3-Tier High Availability')}",
        f"Estrategia 6R:    {rea_data.get('migration_strategy', 'Replatform (Lift, Tinker & Shift)')}",
        f"Servicios AWS:    {', '.join(proposal_data.get('selected_services', []))}",
        "Descripcion General del Sistema:",
        "----------------------------------------------------------------------",
        "2. POSTURA DE SEGURIDAD E IDENTIDAD IAM (0 - 100 PTS)",
        f"Puntaje Obtenido: {security_data.get('security_score', 100)} / 100 pts",
        f"Clasificacion:    {security_data.get('posture_label', 'Postura Robusta')}",
        f" - Cuenta Root Protegida (+20):          {'ACTIVO' if security_data.get('rootBlocked', True) else 'INACTIVO'}",
        f" - MFA Obligatorio en IAM (+20):         {'ACTIVO' if security_data.get('mfaEnforced', True) else 'INACTIVO'}",
        f" - Roles STS de Instancia EC2 (+20):     {'ACTIVO' if security_data.get('ec2Roles', True) else 'INACTIVO'}",
        f" - Cifrado en Transito TLS 1.3 (+15):    {'ACTIVO' if security_data.get('tls13', True) else 'INACTIVO'}",
        f" - S3 SSE-KMS y Versionado (+15):        {'ACTIVO' if security_data.get('s3EncryptionAndVersioning', True) else 'INACTIVO'}",
        f" - Auditoria Inmutable CloudTrail (+10): {'ACTIVO' if security_data.get('complianceAudits', True) else 'INACTIVO'}",
        "----------------------------------------------------------------------",
        "3. ESCENARIOS FINOPS COMPARATIVOS (730 HORAS/MES)",
    ]

    system_description = str(
        rea_data.get("system_description") or rea_data.get("system_analysis") or "Sin descripción disponible."
    )
    description_index = lines.index("Descripcion General del Sistema:") + 1
    lines[description_index:description_index] = [f"  {line}" for line in wrap(system_description, width=100)]

    for sc in rea_data.get("scenarios", []):
        sc_type = sc.get("scenario_type", "Scenario")
        pricing = sc.get("pricing", {})
        m_usd = pricing.get("monthly_total_usd", 0.0)
        a_usd = pricing.get("annual_total_usd", 0.0)
        lines.append(f" * {sc_type}: USD ${m_usd:.2f} / mes  (USD ${a_usd:.2f} / anio)")

    lines.append("----------------------------------------------------------------------")
    lines.append("4. PILARES AWS WELL-ARCHITECTED APLICADOS")
    for note in rea_data.get("well_architected_notes", [])[:4]:
        lines.append(f" - {note[:88]}")

    # Construcción del flujo de texto PostScript/PDF en coordenadas A4 (595 x 842)
    content_ops: List[str] = ["BT", "/F1 10 Tf", "45 795 Td", "14 TL"]
    for idx, line in enumerate(lines):
        escaped = _escape_pdf_text(line)
        if idx == 0:
            content_ops.append(f"({escaped}) Tj")
        else:
            content_ops.append(f"T* ({escaped}) Tj")
    content_ops.append("ET")
    stream_data = "\n".join(content_ops).encode("latin-1")

    # Estructura de objetos PDF 1.4 con tabla xref exacta
    objects: List[bytes] = [
        b"1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n",
        b"2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n",
        (
            b"3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] "
            b"/Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\nendobj\n"
        ),
        b"4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>\nendobj\n",
        f"5 0 obj\n<< /Length {len(stream_data)} >>\nstream\n".encode("latin-1")
        + stream_data
        + b"\nendstream\nendobj\n",
    ]

    pdf_out = bytearray(b"%PDF-1.4\n")
    offsets: List[int] = [0]
    for obj_bytes in objects:
        offsets.append(len(pdf_out))
        pdf_out.extend(obj_bytes)

    xref_pos = len(pdf_out)
    pdf_out.extend(f"xref\n0 {len(offsets)}\n0000000000 65535 f \n".encode("latin-1"))
    for off in offsets[1:]:
        pdf_out.extend(f"{off:010d} 00000 n \n".encode("latin-1"))

    pdf_out.extend(
        f"trailer\n<< /Size {len(offsets)} /Root 1 0 R >>\nstartxref\n{xref_pos}\n%%EOF\n".encode(
            "latin-1"
        )
    )
    return bytes(pdf_out)

