import type { CloudProposal, EnterpriseEvaluationResponse } from '../types/awsTypes';
import type { MigrationSecuritySummary } from '../components/AwsReaTechSheetModal';

const PAGE_W = 1240;
const PAGE_H = 1754; // A4 @ ~150 DPI
const MARGIN_X = 64;
const CONTENT_W = PAGE_W - MARGIN_X * 2;
const BOTTOM_LIMIT = PAGE_H - 96;

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  const words = (text || '').split(/\s+/);
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines.length > 0 ? lines : [''];
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  fill?: string,
  stroke?: string,
  lineWidth = 1.5
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
  }
}

function dataUrlToBytes(dataUrl: string): Uint8Array {
  const base64 = dataUrl.split(',')[1] || '';
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) {
    bytes[i] = bin.charCodeAt(i);
  }
  return bytes;
}

/**
 * Empaqueta un arreglo de páginas JPEG en un documento PDF 1.4 multipágina real (application/pdf).
 */
function buildPdfFromJpegPages(pages: Array<{ bytes: Uint8Array; width: number; height: number }>): Blob {
  const encoder = new TextEncoder();
  const chunks: Uint8Array[] = [];
  const offsets: number[] = [0]; // index 0 unused, 1-based object IDs
  let currentOffset = 0;

  const pushStr = (str: string) => {
    const arr = encoder.encode(str);
    chunks.push(arr);
    currentOffset += arr.byteLength;
  };

  const pushBytes = (arr: Uint8Array) => {
    chunks.push(arr);
    currentOffset += arr.byteLength;
  };

  const startObj = (id: number) => {
    offsets[id] = currentOffset;
    pushStr(`${id} 0 obj\n`);
  };

  const endObj = () => {
    pushStr(`\nendobj\n`);
  };

  pushStr('%PDF-1.4\n%\xFF\xFF\xFF\xFF\n');

  // Object 1: Catalog
  startObj(1);
  pushStr('<< /Type /Catalog /Pages 2 0 R >>');
  endObj();

  // Object 2: Pages (kids filled below)
  const pageCount = pages.length;
  const pageObjIds = pages.map((_, i) => 3 + i * 3);
  startObj(2);
  pushStr(
    `<< /Type /Pages /Count ${pageCount} /Kids [${pageObjIds.map((id) => `${id} 0 R`).join(' ')}] >>`
  );
  endObj();

  // A4 dimensions in PDF points
  const pdfW = 595.28;
  const pdfH = 841.89;

  pages.forEach((p, idx) => {
    const pageObjId = 3 + idx * 3;
    const contentObjId = pageObjId + 1;
    const imageObjId = pageObjId + 2;
    const imgName = `/Im${idx}`;

    // Page object
    startObj(pageObjId);
    pushStr(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pdfW} ${pdfH}] /Resources << /XObject << ${imgName} ${imageObjId} 0 R >> >> /Contents ${contentObjId} 0 R >>`
    );
    endObj();

    // Content stream drawing the image full-bleed
    const contentStream = `q\n${pdfW} 0 0 ${pdfH} 0 0 cm\n${imgName} Do\nQ\n`;
    const contentBytes = encoder.encode(contentStream);
    startObj(contentObjId);
    pushStr(`<< /Length ${contentBytes.byteLength} >>\nstream\n`);
    pushBytes(contentBytes);
    pushStr('\nendstream');
    endObj();

    // Image XObject (JPEG /DCTDecode)
    startObj(imageObjId);
    pushStr(
      `<< /Type /XObject /Subtype /Image /Width ${p.width} /Height ${p.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${p.bytes.byteLength} >>\nstream\n`
    );
    pushBytes(p.bytes);
    pushStr('\nendstream');
    endObj();
  });

  const totalObjects = 2 + pageCount * 3;
  const xrefOffset = currentOffset;
  pushStr(`xref\n0 ${totalObjects + 1}\n`);
  pushStr('0000000000 65535 f \n');
  for (let id = 1; id <= totalObjects; id++) {
    const off = String(offsets[id] || 0).padStart(10, '0');
    pushStr(`${off} 00000 n \n`);
  }

  pushStr(
    `trailer\n<< /Size ${totalObjects + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`
  );

  return new Blob(chunks as BlobPart[], { type: 'application/pdf' });
}

export function exportReaTechSheetPdf(
  proposal: CloudProposal,
  reaData: EnterpriseEvaluationResponse,
  securitySummary: MigrationSecuritySummary
): void {
  const canvases: HTMLCanvasElement[] = [];

  const createNewPage = (): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D; y: number } => {
    const canvas = document.createElement('canvas');
    canvas.width = PAGE_W;
    canvas.height = PAGE_H;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, PAGE_W, PAGE_H);
    canvases.push(canvas);
    return { canvas, ctx, y: 56 };
  };

  let page = createNewPage();
  let ctx = page.ctx;
  let y = page.y;

  const ensureSpace = (neededHeight: number) => {
    if (y + neededHeight > BOTTOM_LIMIT) {
      page = createNewPage();
      ctx = page.ctx;
      y = 64;
    }
  };

  const appliedScenarioName = proposal.appliedScenario || 'Recommended-Production';
  const activeScenario =
    reaData.scenarios.find((s) => s.scenario_type === appliedScenarioName) ||
    reaData.scenarios[1] ||
    reaData.scenarios[0];

  // =========================================================
  // CABECERA EJECUTIVA OSCURA (Página 1)
  // =========================================================
  const headerH = 195;
  drawRoundedRect(ctx, MARGIN_X, y, CONTENT_W, headerH, 20, '#0f172a', '#1e293b', 2);

  // Badges superiores
  let badgeX = MARGIN_X + 28;
  const badgeY = y + 26;

  const drawBadge = (text: string, bg: string, fg: string, border?: string) => {
    ctx.font = 'bold 15px "Inter", "Segoe UI", Arial, sans-serif';
    const w = ctx.measureText(text).width + 26;
    drawRoundedRect(ctx, badgeX, badgeY, w, 30, 15, bg, border, 1);
    ctx.fillStyle = fg;
    ctx.fillText(text, badgeX + 13, badgeY + 20);
    badgeX += w + 10;
  };

  drawBadge('FICHA TÉCNICA · EVALUACIÓN REA', '#2563eb', '#ffffff');
  drawBadge(reaData.migration_strategy, 'rgba(16, 185, 129, 0.22)', '#34d399', '#10b981');
  drawBadge(
    `Seguridad: ${securitySummary.score}/100 (${securitySummary.postureLabel})`,
    'rgba(16, 185, 129, 0.18)',
    '#6ee7b7',
    '#10b981'
  );

  // Sub-badge de patrón
  ctx.font = '600 14px "Inter", "Segoe UI", Arial, sans-serif';
  ctx.fillStyle = '#93c5fd';
  ctx.fillText(`Patrón: ${reaData.architecture_pattern}`, MARGIN_X + 28, y + 82);

  // Título de la Propuesta
  ctx.font = 'bold 31px "Inter", "Segoe UI", Arial, sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(proposal.solutionName, MARGIN_X + 28, y + 124);

  // Metadatos en cabecera
  ctx.font = '500 16px "Inter", "Segoe UI", Arial, sans-serif';
  ctx.fillStyle = '#cbd5e1';
  const metaLine = `Región: ${proposal.region}   •   Tipo: ${proposal.appType}   •   SLA: ${proposal.availabilityLevel}   •   Usuarios: ${proposal.estimatedUsers.toLocaleString()}`;
  ctx.fillText(metaLine, MARGIN_X + 28, y + 158);

  y += headerH + 26;

  // =========================================================
  // 1. DICTAMEN DE EVALUACIÓN DE ARQUITECTURA (MOTOR REA)
  // =========================================================
  ctx.font = '500 16px "Inter", "Segoe UI", Arial, sans-serif';
  const analysisLines = wrapText(ctx, reaData.system_analysis, CONTENT_W - 44);
  const analysisBoxH = 56 + analysisLines.length * 24;

  drawRoundedRect(ctx, MARGIN_X, y, CONTENT_W, analysisBoxH, 14, '#f8fafc', '#e2e8f0', 1.5);
  ctx.font = 'bold 18px "Inter", "Segoe UI", Arial, sans-serif';
  ctx.fillStyle = '#0f172a';
  ctx.fillText('1. Dictamen de Evaluación de Arquitectura (Motor REA)', MARGIN_X + 22, y + 32);

  ctx.font = '400 15.5px "Inter", "Segoe UI", Arial, sans-serif';
  ctx.fillStyle = '#334155';
  analysisLines.forEach((line, i) => {
    ctx.fillText(line, MARGIN_X + 22, y + 60 + i * 24);
  });

  y += analysisBoxH + 20;

  // 4 Tarjetas de Metadatos Clave
  const kpiGap = 14;
  const kpiW = (CONTENT_W - kpiGap * 3) / 4;
  const kpiH = 82;
  const kpis = [
    { label: 'Origen Detectado', value: reaData.origin_detected, color: '#0f172a' },
    { label: 'Escenario Aplicado', value: activeScenario?.scenario_type || 'Recommended-Production', color: '#2563eb' },
    {
      label: 'Presupuesto Mensual / Anual',
      value: `$${proposal.monthlyBudget.toFixed(2)}/mes · $${proposal.annualBudget.toLocaleString()}/año`,
      color: '#16a34a',
    },
    {
      label: 'Postura de Seguridad Cloud',
      value: `${securitySummary.score}/100 pts · ${securitySummary.postureLabel}`,
      color: securitySummary.postureColor,
    },
  ];

  kpis.forEach((k, idx) => {
    const kx = MARGIN_X + idx * (kpiW + kpiGap);
    drawRoundedRect(ctx, kx, y, kpiW, kpiH, 12, '#ffffff', '#e2e8f0', 1.5);
    ctx.font = '600 13.5px "Inter", "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = '#64748b';
    ctx.fillText(k.label, kx + 14, y + 28);

    ctx.font = 'bold 15px "Inter", "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = k.color;
    const valLines = wrapText(ctx, k.value, kpiW - 24);
    ctx.fillText(valLines[0] || '', kx + 14, y + 54);
    if (valLines[1]) {
      ctx.font = 'bold 13.5px "Inter", "Segoe UI", Arial, sans-serif';
      ctx.fillText(valLines[1], kx + 14, y + 72);
    }
  });

  y += kpiH + 28;

  // =========================================================
  // 2. MATRIZ DE DIMENSIONAMIENTO Y SERVICIOS AWS
  // =========================================================
  if (activeScenario && activeScenario.services.length > 0) {
    ensureSpace(120);
    ctx.font = 'bold 19px "Inter", "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = '#0f172a';
    ctx.fillText(
      `2. Matriz de Dimensionamiento y Servicios AWS (${activeScenario.services.length} servicios)`,
      MARGIN_X,
      y + 20
    );
    y += 32;

    // Cabecera de tabla
    const col1W = 240;
    const col2W = 310;
    const col3W = 430;
    drawRoundedRect(ctx, MARGIN_X, y, CONTENT_W, 40, 10, '#f1f5f9', '#cbd5e1', 1);
    ctx.font = 'bold 14.5px "Inter", "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = '#334155';
    ctx.fillText('Servicio AWS', MARGIN_X + 14, y + 25);
    ctx.fillText('Rol y Especificación (Sizing)', MARGIN_X + col1W + 12, y + 25);
    ctx.fillText('Justificación REA', MARGIN_X + col1W + col2W + 12, y + 25);
    ctx.fillText('Costo / Mes', MARGIN_X + col1W + col2W + col3W + 12, y + 25);
    y += 42;

    activeScenario.services.forEach((svc, idx) => {
      ctx.font = '400 13.5px "Inter", "Segoe UI", Arial, sans-serif';
      const reasonLines = wrapText(ctx, svc.reason, col3W - 22);
      const specsLines = wrapText(ctx, `${svc.quantity}x · ${svc.specs}`, col2W - 22);
      const rowH = Math.max(66, Math.max(reasonLines.length, specsLines.length + 1) * 20 + 22);

      ensureSpace(rowH + 8);

      drawRoundedRect(
        ctx,
        MARGIN_X,
        y,
        CONTENT_W,
        rowH,
        8,
        idx % 2 === 0 ? '#ffffff' : '#f8fafc',
        '#e2e8f0',
        1
      );

      // Col 1: Servicio + Categoría
      ctx.font = 'bold 14px "Inter", "Segoe UI", Arial, sans-serif';
      ctx.fillStyle = '#0f172a';
      const nameLines = wrapText(ctx, svc.service_name, col1W - 22);
      ctx.fillText(nameLines[0] || '', MARGIN_X + 14, y + 24);
      if (nameLines[1]) {
        ctx.fillText(nameLines[1], MARGIN_X + 14, y + 42);
      }

      ctx.font = 'bold 12px "Inter", "Segoe UI", Arial, sans-serif';
      ctx.fillStyle = '#2563eb';
      ctx.fillText(
        `[${svc.category}]`,
        MARGIN_X + 14,
        y + (nameLines.length > 1 ? 60 : 44)
      );

      // Col 2: Rol y Specs
      ctx.font = 'bold 14px "Inter", "Segoe UI", Arial, sans-serif';
      ctx.fillStyle = '#1e293b';
      const roleLines = wrapText(ctx, svc.role, col2W - 22);
      ctx.fillText(roleLines[0] || '', MARGIN_X + col1W + 12, y + 24);

      ctx.font = '400 13px "Inter", "Segoe UI", Arial, sans-serif';
      ctx.fillStyle = '#64748b';
      specsLines.slice(0, 2).forEach((sl, si) => {
        ctx.fillText(sl, MARGIN_X + col1W + 12, y + 44 + si * 18);
      });

      // Col 3: Justificación REA
      ctx.font = '400 13.5px "Inter", "Segoe UI", Arial, sans-serif';
      ctx.fillStyle = '#475569';
      reasonLines.slice(0, 3).forEach((rl, ri) => {
        ctx.fillText(rl, MARGIN_X + col1W + col2W + 12, y + 24 + ri * 19);
      });

      // Col 4: Costo
      ctx.font = 'bold 15px "Inter", "Segoe UI", Arial, sans-serif';
      ctx.fillStyle = '#0f172a';
      ctx.fillText(
        `$${svc.total_monthly_usd.toFixed(2)}`,
        MARGIN_X + col1W + col2W + col3W + 14,
        y + 28
      );

      y += rowH + 4;
    });

    y += 20;
  }

  // =========================================================
  // 3. SEGURIDAD E IDENTIDAD (IAM) DEL PROYECTO DE MIGRACIÓN
  // =========================================================
  ensureSpace(340);
  ctx.font = 'bold 19px "Inter", "Segoe UI", Arial, sans-serif';
  ctx.fillStyle = '#0f172a';
  ctx.fillText(
    `3. Seguridad e Identidad (IAM) del Proyecto de Migración — ${securitySummary.score}/100 pts (${securitySummary.postureLabel})`,
    MARGIN_X,
    y + 20
  );
  y += 32;

  const secCardGap = 14;
  const secCardW = (CONTENT_W - secCardGap) / 2;
  const secCardH = 104;

  for (let i = 0; i < securitySummary.items.length; i += 2) {
    ensureSpace(secCardH + 14);
    const pair = securitySummary.items.slice(i, i + 2);

    pair.forEach((item, pairIdx) => {
      const cx = MARGIN_X + pairIdx * (secCardW + secCardGap);
      drawRoundedRect(
        ctx,
        cx,
        y,
        secCardW,
        secCardH,
        12,
        item.active ? '#f8fafc' : '#fffbeb',
        item.active ? '#cbd5e1' : '#fde68a',
        1.5
      );

      ctx.font = 'bold 15px "Inter", "Segoe UI", Arial, sans-serif';
      ctx.fillStyle = '#0f172a';
      ctx.fillText(item.title, cx + 16, y + 26);

      // Estado a la derecha
      const statusTxt = item.active
        ? `✓ Activo (+${item.points} pts)`
        : item.applies
        ? `Pendiente (+${item.points} pts)`
        : 'No aplica';
      ctx.font = 'bold 13px "Inter", "Segoe UI", Arial, sans-serif';
      ctx.fillStyle = item.active ? '#15803d' : '#b45309';
      const stW = ctx.measureText(statusTxt).width;
      ctx.fillText(statusTxt, cx + secCardW - stW - 16, y + 26);

      // Dominio y servicio AWS
      ctx.font = 'bold 13px "Inter", "Segoe UI", Arial, sans-serif';
      ctx.fillStyle = '#2563eb';
      ctx.fillText(`${item.domain} · ${item.awsService}`, cx + 16, y + 48);

      // Descripción
      ctx.font = '400 13px "Inter", "Segoe UI", Arial, sans-serif';
      ctx.fillStyle = '#475569';
      const descLines = wrapText(ctx, item.description, secCardW - 32);
      descLines.slice(0, 2).forEach((dl, di) => {
        ctx.fillText(dl, cx + 16, y + 70 + di * 18);
      });
    });

    y += secCardH + 12;
  }

  // Bloque de Roles IAM y Estándares de Cumplimiento
  ensureSpace(96);
  drawRoundedRect(ctx, MARGIN_X, y, CONTENT_W, 82, 12, '#f8fafc', '#e2e8f0', 1.5);
  ctx.font = 'bold 14px "Inter", "Segoe UI", Arial, sans-serif';
  ctx.fillStyle = '#1e293b';
  ctx.fillText(
    `Roles IAM Mínimo Privilegio: ${securitySummary.iamRolesRecommended.join('  •  ')}`,
    MARGIN_X + 18,
    y + 32
  );
  ctx.fillStyle = '#166534';
  ctx.fillText(
    `Estándares de Cumplimiento: ${securitySummary.complianceStandards.join('  •  ')}`,
    MARGIN_X + 18,
    y + 60
  );
  y += 106;

  // =========================================================
  // 4. COMPARATIVA DE ESCENARIOS FINANCIEROS (REA)
  // =========================================================
  if (reaData.scenarios && reaData.scenarios.length > 0) {
    ensureSpace(155);
    ctx.font = 'bold 19px "Inter", "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = '#0f172a';
    ctx.fillText('4. Comparativa de Escenarios Financieros Evaluados por REA', MARGIN_X, y + 20);
    y += 32;

    const scGap = 16;
    const scW = (CONTENT_W - scGap * 2) / 3;
    const scH = 104;

    reaData.scenarios.slice(0, 3).forEach((sc, idx) => {
      const sx = MARGIN_X + idx * (scW + scGap);
      const isCurrent = sc.scenario_type === activeScenario?.scenario_type;
      drawRoundedRect(
        ctx,
        sx,
        y,
        scW,
        scH,
        12,
        isCurrent ? '#eff6ff' : '#f8fafc',
        isCurrent ? '#2563eb' : '#cbd5e1',
        isCurrent ? 2.5 : 1.5
      );

      ctx.font = 'bold 14.5px "Inter", "Segoe UI", Arial, sans-serif';
      ctx.fillStyle = '#0f172a';
      ctx.fillText(sc.scenario_type.replace(/-/g, ' '), sx + 16, y + 28);

      if (isCurrent) {
        ctx.font = 'bold 12px "Inter", "Segoe UI", Arial, sans-serif';
        ctx.fillStyle = '#2563eb';
        ctx.fillText('✓ SELECCIONADO', sx + scW - 126, y + 28);
      }

      ctx.font = 'bold 22px "Inter", "Segoe UI", Arial, sans-serif';
      ctx.fillStyle = '#1d4ed8';
      ctx.fillText(`$${sc.pricing.monthly_total_usd.toFixed(2)} USD/mes`, sx + 16, y + 62);

      ctx.font = '500 13.5px "Inter", "Segoe UI", Arial, sans-serif';
      ctx.fillStyle = '#64748b';
      ctx.fillText(`$${sc.pricing.annual_total_usd.toLocaleString()} USD/año`, sx + 16, y + 86);
    });

    y += scH + 28;
  }

  // =========================================================
  // 5. DICTAMEN AWS WELL-ARCHITECTED FRAMEWORK (REA)
  // =========================================================
  if (reaData.well_architected_notes && reaData.well_architected_notes.length > 0) {
    ctx.font = '400 14.5px "Inter", "Segoe UI", Arial, sans-serif';
    const noteWrapped = reaData.well_architected_notes.map((n) =>
      wrapText(ctx, `• ${n}`, CONTENT_W - 44)
    );
    const totalNoteLines = noteWrapped.reduce((acc, l) => acc + l.length, 0);
    const waBoxH = 56 + totalNoteLines * 23;

    ensureSpace(waBoxH + 20);
    drawRoundedRect(ctx, MARGIN_X, y, CONTENT_W, waBoxH, 14, '#f0fdf4', '#bbf7d0', 1.5);

    ctx.font = 'bold 18px "Inter", "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = '#166534';
    ctx.fillText('5. Dictamen AWS Well-Architected Framework (REA)', MARGIN_X + 20, y + 32);

    ctx.font = '400 14.5px "Inter", "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = '#14532d';
    let lineOffset = y + 60;
    noteWrapped.forEach((lines) => {
      lines.forEach((l) => {
        ctx.fillText(l, MARGIN_X + 20, lineOffset);
        lineOffset += 22;
      });
    });

    y += waBoxH + 18;
  }

  // =========================================================
  // PIE DE PÁGINA EN TODAS LAS PÁGINAS
  // =========================================================
  const totalPages = canvases.length;
  const dateStr = new Date().toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  canvases.forEach((c, idx) => {
    const pCtx = c.getContext('2d')!;
    pCtx.strokeStyle = '#e2e8f0';
    pCtx.lineWidth = 1.5;
    pCtx.beginPath();
    pCtx.moveTo(MARGIN_X, PAGE_H - 64);
    pCtx.lineTo(PAGE_W - MARGIN_X, PAGE_H - 64);
    pCtx.stroke();

    pCtx.font = '600 13px "Inter", "Segoe UI", Arial, sans-serif';
    pCtx.fillStyle = '#64748b';
    pCtx.fillText(
      `Cloud Diagnostix · Ficha Técnica de Evaluación REA y Seguridad IAM · Emitido: ${dateStr}`,
      MARGIN_X,
      PAGE_H - 36
    );

    const pageLabel = `Página ${idx + 1} de ${totalPages}`;
    const pw = pCtx.measureText(pageLabel).width;
    pCtx.fillText(pageLabel, PAGE_W - MARGIN_X - pw, PAGE_H - 36);
  });

  // Convertir cada página a JPEG y construir el archivo PDF
  const jpegPages = canvases.map((c) => ({
    bytes: dataUrlToBytes(c.toDataURL('image/jpeg', 0.94)),
    width: c.width,
    height: c.height,
  }));

  const pdfBlob = buildPdfFromJpegPages(jpegPages);
  const url = URL.createObjectURL(pdfBlob);
  const a = document.createElement('a');
  const slug = proposal.solutionName.toLowerCase().replace(/[^a-z0-9-_]+/g, '-');
  a.href = url;
  a.download = `ficha-tecnica-rea-${slug}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

