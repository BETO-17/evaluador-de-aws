import { MapPin, Layers, Server } from 'lucide-react';
import type { AwsRegionInfo } from '../types/awsTypes';
import type { RegionStatusDetails } from '../data/awsRegionsData';
import StatusBadge from './StatusBadge';

interface RegionCardProps {
  region: AwsRegionInfo;
  isSelected: boolean;
  isTarget: boolean;
  regionServices: string[];
  statusInfo: RegionStatusDetails;
  onSelect: (region: AwsRegionInfo) => void;
}

export default function RegionCard({
  region,
  isSelected,
  regionServices,
  statusInfo,
  onSelect,
}: RegionCardProps) {
  return (
    <div
      onClick={() => onSelect(region)}
      style={{
        background: '#ffffff',
        border: isSelected ? '2px solid #2563eb' : '1px solid #e2e8f0',
        borderRadius: 14,
        padding: '18px 20px',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        gap: 14,
        boxShadow: isSelected ? '0 4px 14px rgba(37, 99, 235, 0.12)' : '0 1px 3px rgba(0, 0, 0, 0.04)',
        transition: 'all 0.18s ease',
        position: 'relative',
      }}
      onMouseEnter={(e) => {
        if (!isSelected) {
          e.currentTarget.style.borderColor = '#cbd5e1';
          e.currentTarget.style.transform = 'translateY(-2px)';
        }
      }}
      onMouseLeave={(e) => {
        if (!isSelected) {
          e.currentTarget.style.borderColor = '#e2e8f0';
          e.currentTarget.style.transform = 'translateY(0)';
        }
      }}
    >
      {/* Header: Name, Code & StatusBadge */}
      <div>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 6 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, color: '#1e293b' }}>
              {region.name}
            </div>
            <span
              style={{
                display: 'inline-block',
                fontSize: 11,
                fontWeight: 700,
                color: '#2563eb',
                background: '#eff6ff',
                padding: '2px 8px',
                borderRadius: 6,
                marginTop: 4,
              }}
            >
              {region.code}
            </span>
          </div>

          <StatusBadge status={statusInfo.status} />
        </div>

        {/* Location Info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#64748b', marginTop: 8 }}>
          <MapPin size={13} color="#94a3b8" />
          <span>{region.location} • {region.continent}</span>
        </div>
      </div>

      {/* Meta Specs: AZs & Deployed Services */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 12, borderTop: '1px solid #f1f5f9' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12 }}>
          <span style={{ color: '#64748b', display: 'flex', alignItems: 'center', gap: 5 }}>
            <Layers size={13} color="#94a3b8" /> Zonas de Disponibilidad:
          </span>
          <strong style={{ color: '#1e293b' }}>{region.availabilityZones} AZs</strong>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ color: '#64748b', display: 'flex', alignItems: 'center', gap: 5 }}>
              <Server size={13} color="#94a3b8" /> Servicios Desplegados:
            </span>
            {regionServices.length === 0 && (
              <span style={{ color: '#94a3b8', fontSize: 11.5 }}>Sin servicios</span>
            )}
          </div>
          {regionServices.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
              {regionServices.map((svc) => (
                <span
                  key={svc}
                  style={{
                    background: '#f0fdf4',
                    border: '1px solid #bbf7d0',
                    color: '#166534',
                    fontSize: 11,
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: 6,
                  }}
                >
                  {svc}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
