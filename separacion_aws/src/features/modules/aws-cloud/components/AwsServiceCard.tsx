import { useState } from 'react';
import {
  Server,
  Database,
  HardDrive,
  Network,
  Shield,
  Zap,
  Activity,
  Globe,
  Info,
  X,
  Plus,
} from 'lucide-react';
import type { AwsService } from '../types/awsTypes';
import { useAws } from '../context/AwsContext';
import StatusBadge from './StatusBadge';

interface AwsServiceCardProps {
  service: AwsService;
  onSelect?: (service: AwsService) => void;
  isSelected?: boolean;
}

export default function AwsServiceCard({
  service,
  onSelect,
  isSelected = false,
}: AwsServiceCardProps) {
  const { services, addService, removeService } = useAws();
  const [showDetailModal, setShowDetailModal] = useState(false);

  const isDeployed = services.some((s) => s.toLowerCase() === service.codeName.toLowerCase());

  const getServiceIcon = () => {
    switch (service.iconType) {
      case 'server':
        return <Server size={20} />;
      case 'database':
        return <Database size={20} />;
      case 'hard-drive':
        return <HardDrive size={20} />;
      case 'network':
        return <Network size={20} />;
      case 'shield':
        return <Shield size={20} />;
      case 'zap':
        return <Zap size={20} />;
      case 'activity':
        return <Activity size={20} />;
      case 'globe':
      default:
        return <Globe size={20} />;
    }
  };

  const getCategoryColor = () => {
    switch (service.category) {
      case 'Cómputo':
        return { bg: '#eff6ff', text: '#2563eb', border: '#bfdbfe' };
      case 'Almacenamiento':
        return { bg: '#ecfeff', text: '#0891b2', border: '#a5f3fc' };
      case 'Base de Datos':
        return { bg: '#f1f5f9', text: '#475569', border: '#cbd5e1' };
      case 'Seguridad e Identidad':
        return { bg: '#eef2ff', text: '#4f46e5', border: '#c7d2fe' };
      case 'Serverless':
        return { bg: '#f5f3ff', text: '#7c3aed', border: '#ddd6fe' };
      case 'Monitoreo y Gestión':
        return { bg: '#f8fafc', text: '#64748b', border: '#e2e8f0' };
      case 'Redes y CDN':
      default:
        return { bg: '#f0f9ff', text: '#0284c7', border: '#bae6fd' };
    }
  };

  const catStyle = getCategoryColor();

  const handleToggleDeploy = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isDeployed) {
      removeService(service.codeName);
    } else {
      addService(service.codeName);
    }
  };

  return (
    <>
      <div
        style={{
          background: '#ffffff',
          border: isDeployed ? '2px solid #2563eb' : isSelected ? '2px solid #3b82f6' : '1px solid #e2e8f0',
          borderRadius: 14,
          padding: '22px',
          boxShadow: isDeployed ? '0 8px 24px rgba(37, 99, 235, 0.12)' : '0 2px 6px rgba(0, 0, 0, 0.03)',
          transition: 'all 0.25s ease',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          cursor: onSelect ? 'pointer' : 'default',
        }}
        onClick={() => onSelect && onSelect(service)}
      >
        <div>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 10,
                background: catStyle.bg,
                color: catStyle.text,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {getServiceIcon()}
            </div>

            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <StatusBadge
                variant={isDeployed ? 'success' : 'neutral'}
                status={isDeployed ? 'En uso' : 'No usado'}
                size="sm"
              />

              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  padding: '3px 9px',
                  borderRadius: 20,
                  background: catStyle.bg,
                  color: catStyle.text,
                  border: `1px solid ${catStyle.border}`,
                }}
              >
                {service.category}
              </span>
            </div>
          </div>

          <h3 style={{ fontSize: 16, fontWeight: 800, color: '#1e293b', margin: '0 0 6px' }}>
            {service.name}
          </h3>

          <p style={{ fontSize: 12.5, color: '#64748b', lineHeight: 1.5, margin: '0 0 12px' }}>
            {service.description}
          </p>

          {/* Función Principal */}
          <div
            style={{
              background: '#f8fafc',
              padding: '9px 12px',
              borderRadius: 8,
              border: '1px solid #e2e8f0',
              marginBottom: 16,
            }}
          >
            <span style={{ fontSize: 11, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 3 }}>
              Función principal:
            </span>
            <p style={{ fontSize: 12, color: '#1e293b', margin: 0, lineHeight: 1.45 }}>
              {service.mainFunction}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div style={{ paddingTop: 14, borderTop: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: 11, color: '#94a3b8' }}>Tarifa estimada</span>
            <span style={{ fontSize: 12.5, fontWeight: 700, color: '#1e293b' }}>
              {service.pricing.unit === 'free' ? 'Gratis' : service.pricing.unitLabel}
            </span>
          </div>

          <div style={{ display: 'flex', gap: 6 }}>
            <button
              type="button"
              onClick={handleToggleDeploy}
              style={{
                background: isDeployed ? 'rgba(239, 68, 68, 0.1)' : '#eff6ff',
                border: isDeployed ? '1px solid #fca5a5' : '1px solid #bfdbfe',
                borderRadius: 8,
                padding: '6px 12px',
                fontSize: 12,
                fontWeight: 700,
                color: isDeployed ? '#dc2626' : '#1d4ed8',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                transition: 'all 0.2s ease',
              }}
            >
              {isDeployed ? 'Quitar' : <><Plus size={12} /> Añadir</>}
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowDetailModal(true);
              }}
              style={{
                background: '#f8fafc',
                border: '1px solid #cbd5e1',
                borderRadius: 8,
                padding: '6px 10px',
                fontSize: 12,
                fontWeight: 600,
                color: '#334155',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                transition: 'all 0.2s ease',
              }}
            >
              <Info size={13} /> Ficha
            </button>
          </div>
        </div>
      </div>

      {/* Modal Ficha Técnica */}
      {showDetailModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
          }}
          onClick={() => setShowDetailModal(false)}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: 16,
              width: '100%',
              maxWidth: 540,
              padding: 28,
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 44, height: 44, borderRadius: 10, background: catStyle.bg, color: catStyle.text, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {getServiceIcon()}
                </div>
                <div>
                  <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0, color: '#1e293b' }}>{service.name}</h2>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                    <span style={{ fontSize: 12, color: catStyle.text, fontWeight: 700 }}>{service.category} • {service.codeName}</span>
                    <StatusBadge
                      variant={isDeployed ? 'success' : 'neutral'}
                      status={isDeployed ? 'En uso' : 'No usado'}
                      size="sm"
                    />
                  </div>
                </div>
              </div>
              <button
                onClick={() => setShowDetailModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, fontSize: 13 }}>
              <div>
                <strong style={{ color: '#1e293b', display: 'block', marginBottom: 4 }}>Descripción:</strong>
                <p style={{ margin: 0, color: '#475569', lineHeight: 1.5 }}>{service.description}</p>
              </div>

              <div>
                <strong style={{ color: '#1e293b', display: 'block', marginBottom: 4 }}>Función Principal:</strong>
                <p style={{ margin: 0, color: '#475569', lineHeight: 1.5 }}>{service.mainFunction}</p>
              </div>

              <div>
                <strong style={{ color: '#1e293b', display: 'block', marginBottom: 4 }}>Caso de Uso Recomendado:</strong>
                <p style={{ margin: 0, color: '#475569', lineHeight: 1.5 }}>{service.useCase}</p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, background: '#f8fafc', padding: 14, borderRadius: 10, border: '1px solid #e2e8f0' }}>
                <div>
                  <span style={{ fontSize: 11.5, color: '#64748b' }}>Tarifa y Facturación:</span>
                  <div style={{ fontWeight: 700, color: '#1e293b' }}>{service.pricing.unitLabel}</div>
                  {service.pricing.note && (
                    <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>Nota: {service.pricing.note}</div>
                  )}
                </div>
                <div>
                  <span style={{ fontSize: 11.5, color: '#64748b' }}>SLA de Disponibilidad:</span>
                  <div style={{ fontWeight: 700, color: '#16a34a' }}>{service.slaPercent}%</div>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 22, paddingTop: 14, borderTop: '1px solid #f1f5f9' }}>
              <button
                type="button"
                onClick={handleToggleDeploy}
                style={{
                  background: isDeployed ? 'rgba(239, 68, 68, 0.1)' : '#2563eb',
                  color: isDeployed ? '#dc2626' : '#ffffff',
                  border: isDeployed ? '1px solid #fca5a5' : 'none',
                  borderRadius: 8,
                  padding: '8px 18px',
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                {isDeployed ? 'Quitar de la Arquitectura' : '+ Añadir a la Arquitectura'}
              </button>

              <button
                type="button"
                onClick={() => setShowDetailModal(false)}
                style={{
                  background: '#f1f5f9',
                  color: '#475569',
                  border: 'none',
                  borderRadius: 8,
                  padding: '8px 18px',
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: 'pointer',
                }}
              >
                Cerrar Ficha
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
