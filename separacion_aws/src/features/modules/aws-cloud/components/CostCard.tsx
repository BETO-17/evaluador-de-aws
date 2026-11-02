import React from 'react';

interface CostCardProps {
  title: string;
  value: string | number;
  subtitle?: React.ReactNode;
  icon: React.ComponentType<{ size?: number; color?: string }>;
  iconColor: string;
  iconBg: string;
  badge?: React.ReactNode;
}

export default function CostCard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconColor,
  iconBg,
  badge,
}: CostCardProps) {
  return (
    <div
      style={{
        background: '#FFFFFF',
        border: '1px solid #E2E8F0',
        borderRadius: 14,
        padding: '20px 22px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        gap: 14,
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: '#64748B' }}>
          {title}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {badge}
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 10,
              background: iconBg,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon size={20} color={iconColor} />
          </div>
        </div>
      </div>
      <div>
        <div style={{ fontSize: 28, fontWeight: 800, color: '#1E293B', lineHeight: 1.1 }}>
          {value}
        </div>
        {subtitle && (
          <div style={{ fontSize: 12, color: '#64748B', marginTop: 8 }}>
            {subtitle}
          </div>
        )}
      </div>
    </div>
  );
}
