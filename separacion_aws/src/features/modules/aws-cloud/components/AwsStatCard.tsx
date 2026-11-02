import type { LucideIcon } from 'lucide-react';

interface AwsStatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  badgeText?: string;
  badgeType?: 'success' | 'warning' | 'info' | 'alert' | 'neutral';
  icon: LucideIcon;
  iconColor?: string;
  iconBg?: string;
  trend?: string;
  trendPositive?: boolean;
  onClick?: () => void;
  clickableHint?: string;
}

export default function AwsStatCard({
  title,
  value,
  subtitle,
  badgeText,
  badgeType = 'info',
  icon: Icon,
  iconColor = '#2563eb',
  iconBg = 'rgba(37, 99, 235, 0.1)',
  trend,
  trendPositive = true,
  onClick,
  clickableHint,
}: AwsStatCardProps) {
  const getBadgeStyle = () => {
    switch (badgeType) {
      case 'success':
        return { bg: 'rgba(22, 163, 74, 0.12)', color: '#16a34a', border: '1px solid rgba(22, 163, 74, 0.25)' };
      case 'warning':
        return { bg: 'rgba(245, 158, 11, 0.14)', color: '#d97706', border: '1px solid rgba(245, 158, 11, 0.3)' };
      case 'alert':
        return { bg: 'rgba(220, 38, 38, 0.12)', color: '#dc2626', border: '1px solid rgba(220, 38, 38, 0.25)' };
      case 'neutral':
        return { bg: '#f1f5f9', color: '#64748b', border: '1px solid #cbd5e1' };
      case 'info':
      default:
        return { bg: 'rgba(37, 99, 235, 0.1)', color: '#2563eb', border: '1px solid rgba(37, 99, 235, 0.2)' };
    }
  };

  const badgeStyle = getBadgeStyle();

  return (
    <div
      onClick={onClick}
      className={onClick ? 'aws-stat-card-clickable' : ''}
      style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: 14,
        padding: '20px 22px',
        boxShadow: '0 2px 6px rgba(0, 0, 0, 0.03)',
        transition: 'all 0.2s ease',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        cursor: onClick ? 'pointer' : 'default',
        position: 'relative',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#64748b' }}>{title}</span>
          {onClick && (
            <span style={{ fontSize: 10.5, color: '#3b82f6', background: 'rgba(59, 130, 246, 0.08)', padding: '1px 6px', borderRadius: 6, fontWeight: 700, whiteSpace: 'nowrap', flexShrink: 0 }}>
              {clickableHint || 'Detalle ↗'}
            </span>
          )}
        </div>
        <div
          style={{
            width: 38,
            height: 38,
            borderRadius: 10,
            background: iconBg,
            color: iconColor,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon size={19} />
        </div>
      </div>

      <div>
        <div style={{ fontSize: 24, fontWeight: 800, color: '#1e293b', letterSpacing: '-0.4px', margin: '0 0 6px' }}>
          {value}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
          {subtitle && <span style={{ fontSize: 12, color: '#64748b' }}>{subtitle}</span>}
          {trend && (
            <span
              style={{
                fontSize: 11.5,
                fontWeight: 700,
                color: trend === 'Sin definir' ? '#64748b' : (trendPositive ? '#16a34a' : '#dc2626'),
              }}
            >
              {trend}
            </span>
          )}
          {badgeText && (
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: 12,
                background: badgeStyle.bg,
                color: badgeStyle.color,
                border: badgeStyle.border,
              }}
            >
              {badgeText}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
