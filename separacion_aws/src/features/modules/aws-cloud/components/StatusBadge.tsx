import React from 'react';

export type StatusVariant = 'success' | 'warning' | 'danger' | 'neutral';

interface StatusBadgeProps {
  status?: string;
  variant?: StatusVariant;
  size?: 'sm' | 'md';
  children?: React.ReactNode;
  style?: React.CSSProperties;
}

const VARIANT_MAP: Record<
  StatusVariant,
  { color: string; bg: string; border: string; dot: string }
> = {
  success: {
    color: '#15803D',
    bg: '#DCFCE7',
    border: '#86EFAC',
    dot: '#16A34A',
  },
  warning: {
    color: '#B45309',
    bg: '#FEF3C7',
    border: '#FDE68A',
    dot: '#F59E0B',
  },
  danger: {
    color: '#B91C1C',
    bg: '#FEE2E2',
    border: '#FECACA',
    dot: '#DC2626',
  },
  neutral: {
    color: '#475569',
    bg: '#F1F5F9',
    border: '#E2E8F0',
    dot: '#94A3B8',
  },
};

function deduceVariant(text: string): StatusVariant {
  const t = text.toLowerCase().trim();
  if (
    t.includes('correcto') ||
    t.includes('en uso') ||
    t.includes('incluido') ||
    t.includes('activo') ||
    t.includes('aprobada') ||
    t.includes('operacional') ||
    t.includes('excelente')
  ) {
    return 'success';
  }
  if (t.includes('requiere revisión') || t.includes('en revisión') || t.includes('revisión')) {
    return 'warning';
  }
  if (t.includes('problema') || t.includes('error') || t.includes('rechazada') || t.includes('crítico')) {
    return 'danger';
  }
  return 'neutral';
}

export default function StatusBadge({
  status,
  variant,
  size = 'md',
  children,
  style,
}: StatusBadgeProps) {
  const displayText = children ? String(children) : status || 'Sin definir';
  const effectiveVariant = variant || deduceVariant(displayText);
  const cfg = VARIANT_MAP[effectiveVariant];

  const isSmall = size === 'sm';

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: isSmall ? '2px 8px' : '3px 10px',
        borderRadius: 20,
        fontSize: isSmall ? 11 : 12,
        fontWeight: 700,
        color: cfg.color,
        background: cfg.bg,
        border: `1px solid ${cfg.border}`,
        lineHeight: 1.2,
        whiteSpace: 'nowrap',
        ...style,
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: cfg.dot,
          flexShrink: 0,
        }}
      />
      <span>{displayText}</span>
    </span>
  );
}
