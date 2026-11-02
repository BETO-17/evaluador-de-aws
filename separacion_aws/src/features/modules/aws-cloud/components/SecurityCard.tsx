import StatusBadge from './StatusBadge';

interface SecurityCardProps {
  title: string;
  isActive: boolean;
  activeDescription: string;
  inactiveDescription: string;
  onToggle: () => void;
  points?: number;
  applies?: boolean;
  disabledTooltip?: string;
}

export default function SecurityCard({
  title,
  isActive,
  activeDescription,
  inactiveDescription,
  onToggle,
  points = 20,
  applies = true,
  disabledTooltip,
}: SecurityCardProps) {
  const effectiveActive = applies && isActive;

  return (
    <div
      onClick={applies ? onToggle : undefined}
      title={!applies ? disabledTooltip : undefined}
      style={{
        background: '#ffffff',
        border: !applies
          ? '1px dashed #cbd5e1'
          : effectiveActive
          ? '2px solid #16a34a'
          : '1px solid #e2e8f0',
        borderRadius: 12,
        padding: 18,
        cursor: !applies ? 'not-allowed' : 'pointer',
        transition: 'all 0.2s ease',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        gap: 12,
        boxShadow: effectiveActive
          ? '0 4px 12px rgba(22, 163, 74, 0.08)'
          : '0 1px 3px rgba(0, 0, 0, 0.03)',
        opacity: !applies ? 0.72 : 1,
      }}
    >
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: 13.5, fontWeight: 700, color: '#1e293b' }}>{title}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {!applies ? (
              <StatusBadge variant="neutral" status="No aplica" size="sm" />
            ) : (
              <StatusBadge
                variant={effectiveActive ? 'success' : 'neutral'}
                status={effectiveActive ? 'Activo' : 'Desactivado'}
                size="sm"
              />
            )}

            {/* Real Switch Toggle: Track + Thumb */}
            <div
              style={{
                width: 38,
                height: 20,
                borderRadius: 10,
                background: !applies ? '#e2e8f0' : effectiveActive ? '#16a34a' : '#cbd5e1',
                position: 'relative',
                transition: 'background 0.2s ease',
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: '50%',
                  background: !applies ? '#94a3b8' : '#ffffff',
                  position: 'absolute',
                  top: 3,
                  left: effectiveActive ? 21 : 3,
                  transition: 'left 0.2s ease',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.25)',
                }}
              />
            </div>
          </div>
        </div>

        <p style={{ margin: 0, fontSize: 12, color: '#64748b', lineHeight: 1.5 }}>
          {!applies
            ? (disabledTooltip || 'Este control no aplica a los servicios de la solución actual.')
            : effectiveActive
            ? activeDescription
            : `${inactiveDescription} (+${points} pts).`}
        </p>
      </div>
    </div>
  );
}
