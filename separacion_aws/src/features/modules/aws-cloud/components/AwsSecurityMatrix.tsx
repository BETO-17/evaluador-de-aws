import { useState } from 'react';
import {
  Lock,
  CheckCircle,
  Server,
  ShieldCheck,
  Sparkles,
  Users,
  FolderTree,
  KeyRound,
  FileCode2,
  Award,
  Info,
} from 'lucide-react';
import { useAws } from '../context/AwsContext';
import StatusBadge from './StatusBadge';
import SecurityCard from './SecurityCard';

export default function AwsSecurityMatrix() {
  const [activeTab, setActiveTab] = useState<'matrix' | 'iam' | 'compliance'>('matrix');
  const { securityControls, toggleSecurityControl, securityScore, services, activeProposal } = useAws();
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const hasEc2 = services.some((s) => s.toLowerCase() === 'ec2');
  const hasS3 = services.some((s) => s.toLowerCase() === 's3');
  const hasProposal = Boolean(activeProposal);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2500);
  };

  const handleToggle = (key: keyof typeof securityControls, label: string) => {
    toggleSecurityControl(String(key));
    showToast(`Control "${label}" modificado.`);
  };

  // Color calculation for Security Posture Indicator
  // < 40 red, 40 to 79 amber, >= 80 green
  const scoreColor = securityScore < 40 ? '#dc2626' : securityScore < 80 ? '#d97706' : '#16a34a';
  const scoreBg = securityScore < 40 ? 'rgba(220, 38, 38, 0.1)' : securityScore < 80 ? 'rgba(245, 158, 11, 0.1)' : 'rgba(22, 163, 74, 0.1)';
  const scoreBadgeVariant = securityScore < 40 ? 'danger' : securityScore < 80 ? 'warning' : 'success';
  const scoreBadgeText = securityScore < 40 ? 'Postura Crítica' : securityScore < 80 ? 'Postura Aceptable' : 'Postura Robusta';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {toastMsg && (
        <div
          style={{
            position: 'fixed',
            top: 20,
            right: 20,
            background: '#0f172a',
            border: '1px solid #16a34a',
            color: '#86efac',
            padding: '12px 20px',
            borderRadius: 12,
            boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
            zIndex: 9999,
            fontWeight: 600,
            fontSize: 13,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <Sparkles size={16} color="#4ade80" />
          {toastMsg}
        </div>
      )}

      {/* Top Banner with Real-time Security Score */}
      <div
        style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: 14,
          padding: '16px 22px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 16,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div
            style={{
              width: 46,
              height: 46,
              borderRadius: 12,
              background: scoreBg,
              color: scoreColor,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.25s ease',
            }}
          >
            <ShieldCheck size={26} />
          </div>
          <div>
            <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>Postura de Seguridad Global</span>
              <StatusBadge variant={scoreBadgeVariant} status={scoreBadgeText} size="sm" />
            </div>
            <div style={{ fontSize: 22, fontWeight: 900, color: '#1e293b' }}>
              <span style={{ color: scoreColor }}>{securityScore}</span>{' '}
              <span style={{ fontSize: 14, color: '#64748b', fontWeight: 500 }}>/ 100 Puntos</span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            onClick={() => setActiveTab('matrix')}
            style={{
              background: activeTab === 'matrix' ? '#2563eb' : '#ffffff',
              color: activeTab === 'matrix' ? '#ffffff' : '#334155',
              border: '1px solid #cbd5e1',
              borderRadius: 8,
              padding: '8px 14px',
              fontSize: 12.5,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              transition: 'all 0.2s ease',
            }}
          >
            <ShieldCheck size={15} />
            <span>Matriz de Responsabilidad</span>
          </button>

          <button
            onClick={() => setActiveTab('iam')}
            style={{
              background: activeTab === 'iam' ? '#2563eb' : '#ffffff',
              color: activeTab === 'iam' ? '#ffffff' : '#334155',
              border: '1px solid #cbd5e1',
              borderRadius: 8,
              padding: '8px 14px',
              fontSize: 12.5,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              transition: 'all 0.2s ease',
            }}
          >
            <Lock size={15} />
            <span>Controles IAM</span>
          </button>

          <button
            onClick={() => setActiveTab('compliance')}
            style={{
              background: activeTab === 'compliance' ? '#2563eb' : '#ffffff',
              color: activeTab === 'compliance' ? '#ffffff' : '#334155',
              border: '1px solid #cbd5e1',
              borderRadius: 8,
              padding: '8px 14px',
              fontSize: 12.5,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              transition: 'all 0.2s ease',
            }}
          >
            <CheckCircle size={15} />
            <span>Cifrado & Cumplimiento</span>
          </button>
        </div>
      </div>

      {/* TAB 1: Shared Responsibility Matrix */}
      {activeTab === 'matrix' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/* Header Concept Card */}
          <div
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: 14,
              padding: '20px 24px',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: 16,
            }}
          >
            <div style={{ background: 'rgba(37, 99, 235, 0.05)', border: '1px solid #bfdbfe', borderRadius: 10, padding: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#1e40af', fontWeight: 800, fontSize: 14, marginBottom: 6 }}>
                <Server size={18} />
                <span>Seguridad 'DE' la Nube (Responsabilidad de AWS)</span>
              </div>
              <p style={{ margin: 0, fontSize: 12.5, color: '#475569', lineHeight: 1.5 }}>
                AWS protege la infraestructura física global: centros de datos, hardware de cómputo, almacenamiento, redes y el software del hipervisor.
              </p>
            </div>

            <div style={{ background: 'rgba(245, 158, 11, 0.05)', border: '1px solid #fde68a', borderRadius: 10, padding: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#92400e', fontWeight: 800, fontSize: 14, marginBottom: 6 }}>
                <Lock size={18} />
                <span>Seguridad 'EN' la Nube (Responsabilidad del Cliente)</span>
              </div>
              <p style={{ margin: 0, fontSize: 12.5, color: '#475569', lineHeight: 1.5 }}>
                El cliente gestiona la seguridad de sus datos, usuarios IAM, cifrado de contenido, configuración de sistemas operativos y reglas de firewall.
              </p>
            </div>
          </div>

          {/* Dynamic Responsibilities Table */}
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 14, overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#1e293b' }}>
                Matriz de Responsabilidad Compartida y Cumplimiento
              </h3>
              <span style={{ fontSize: 12, color: '#64748b' }}>Reactivo a los controles configurados</span>
            </div>

            <div className="aws-table-container">
              <table style={{ width: '100%', minWidth: 640, borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left', color: '#64748b' }}>
                  <th style={{ padding: '12px 18px', width: '24%' }}>Dominio de Seguridad</th>
                  <th style={{ padding: '12px 18px', width: '28%' }}>Garantía de AWS (De la nube)</th>
                  <th style={{ padding: '12px 18px', width: '30%' }}>Responsabilidad del Cliente (En la nube)</th>
                  <th style={{ padding: '12px 18px', width: '18%' }}>Estado Actual</th>
                </tr>
              </thead>
              <tbody>
                {/* 1. IAM */}
                <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '14px 18px', fontWeight: 700, color: '#1e293b' }}>
                    Control de Acceso e Identidades (IAM)
                  </td>
                  <td style={{ padding: '14px 18px', color: '#475569', fontSize: 12.5 }}>
                    Infraestructura de autenticación global y alta disponibilidad del servicio IAM.
                  </td>
                  <td style={{ padding: '14px 18px', color: '#334155', fontSize: 12.5 }}>
                    MFA obligatorio, cuenta root protegida y principio de menor privilegio.
                  </td>
                  <td style={{ padding: '14px 18px' }}>
                    {!hasProposal ? (
                      <StatusBadge variant="neutral" status="Sin definir" size="sm" />
                    ) : securityControls.mfaEnforced && securityControls.rootBlocked ? (
                      <StatusBadge variant="success" status="Cumplido" size="sm" />
                    ) : securityControls.mfaEnforced || securityControls.rootBlocked ? (
                      <StatusBadge variant="warning" status="Requiere revisión" size="sm" />
                    ) : (
                      <StatusBadge variant="danger" status="En riesgo" size="sm" />
                    )}
                  </td>
                </tr>

                {/* 2. Cifrado */}
                <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '14px 18px', fontWeight: 700, color: '#1e293b' }}>
                    Cifrado de Datos en Tránsito y Reposo
                  </td>
                  <td style={{ padding: '14px 18px', color: '#475569', fontSize: 12.5 }}>
                    Módulos HSM criptográficos de AWS KMS y hardware certificados FIPS 140-2.
                  </td>
                  <td style={{ padding: '14px 18px', color: '#334155', fontSize: 12.5 }}>
                    Forzar TLS 1.3 con certificados ACM y cifrado SSE-S3/KMS en buckets.
                  </td>
                  <td style={{ padding: '14px 18px' }}>
                    {!hasProposal ? (
                      <StatusBadge variant="neutral" status="Sin definir" size="sm" />
                    ) : hasS3 ? (
                      securityControls.tls13 && securityControls.s3EncryptionAndVersioning ? (
                        <StatusBadge variant="success" status="Cumplido" size="sm" />
                      ) : securityControls.tls13 || securityControls.s3EncryptionAndVersioning ? (
                        <StatusBadge variant="warning" status="Requiere revisión" size="sm" />
                      ) : (
                        <StatusBadge variant="danger" status="En riesgo" size="sm" />
                      )
                    ) : securityControls.tls13 ? (
                      <StatusBadge variant="success" status="Cumplido" size="sm" />
                    ) : (
                      <StatusBadge variant="warning" status="Requiere revisión" size="sm" />
                    )}
                  </td>
                </tr>

                {/* 3. OS & Roles */}
                <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '14px 18px', fontWeight: 700, color: '#1e293b' }}>
                    Sistemas Operativos y Credenciales de Cómputo
                  </td>
                  <td style={{ padding: '14px 18px', color: '#475569', fontSize: 12.5 }}>
                    Aislamiento del hipervisor Nitro y seguridad física de servidores EC2.
                  </td>
                  <td style={{ padding: '14px 18px', color: '#334155', fontSize: 12.5 }}>
                    Uso de Roles de Instancia (EC2 Roles) en lugar de claves estáticas.
                  </td>
                  <td style={{ padding: '14px 18px' }}>
                    {!hasProposal ? (
                      <StatusBadge variant="neutral" status="Sin definir" size="sm" />
                    ) : !hasEc2 ? (
                      <StatusBadge variant="neutral" status="No aplica" size="sm" />
                    ) : securityControls.ec2Roles ? (
                      <StatusBadge variant="success" status="Cumplido" size="sm" />
                    ) : (
                      <StatusBadge variant="danger" status="En riesgo" size="sm" />
                    )}
                  </td>
                </tr>

                {/* 4. Compliance */}
                <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '14px 18px', fontWeight: 700, color: '#1e293b' }}>
                    Auditorías y Cumplimiento Normativo
                  </td>
                  <td style={{ padding: '14px 18px', color: '#475569', fontSize: 12.5 }}>
                    Auditorías externas periódicas de centros de datos de AWS (SOC 1/2/3, ISO 27001).
                  </td>
                  <td style={{ padding: '14px 18px', color: '#334155', fontSize: 12.5 }}>
                    Habilitar registro de auditoría centralizado con Amazon CloudTrail.
                  </td>
                  <td style={{ padding: '14px 18px' }}>
                    {!hasProposal ? (
                      <StatusBadge variant="neutral" status="Sin definir" size="sm" />
                    ) : securityControls.complianceAudits ? (
                      <StatusBadge variant="success" status="Cumplido" size="sm" />
                    ) : (
                      <StatusBadge variant="warning" status="Requiere revisión" size="sm" />
                    )}
                  </td>
                </tr>
              </tbody>
            </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: IAM Identity & Access Management Controls */}
      {activeTab === 'iam' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Main Security Cards */}
          <div className="aws-responsive-grid-3">
            <SecurityCard
              title="Cuenta root protegida"
              isActive={securityControls.rootBlocked}
              activeDescription="Activo: MFA activado, sin access keys y sin uso diario."
              inactiveDescription="Desactivado: Proteger cuenta root (MFA activado, sin access keys)"
              points={20}
              onToggle={() => handleToggle('rootBlocked', 'Cuenta root protegida')}
            />
            <SecurityCard
              title="MFA Obligatorio en IAM"
              isActive={securityControls.mfaEnforced}
              activeDescription="Activo: 100% de usuarios IAM autentican con MFA / TOTP."
              inactiveDescription="Desactivado: Forzar MFA a todos los usuarios IAM"
              points={20}
              onToggle={() => handleToggle('mfaEnforced', 'MFA Obligatorio en IAM')}
            />
            <SecurityCard
              title="Roles de Instancia (EC2 Roles)"
              isActive={securityControls.ec2Roles}
              activeDescription="Activo: Instancias EC2 asumen credenciales temporales vía AWS STS."
              inactiveDescription="Desactivado: Asignar roles IAM a instancias"
              points={20}
              applies={hasEc2}
              disabledTooltip="Agrega EC2 a tu solución"
              onToggle={() => handleToggle('ec2Roles', 'Roles de Instancia (EC2 Roles)')}
            />
          </div>

          {/* New Section: Estructura IAM de la Solución */}
          <div
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: 14,
              padding: '22px',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
            }}
          >
            <div style={{ marginBottom: 16 }}>
              <h3 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 800, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Users size={18} color="#2563eb" />
                <span>Estructura IAM de la Solución</span>
              </h3>
              <p style={{ margin: 0, fontSize: 12.5, color: '#64748b' }}>
                Organización de identidades, jerarquías de permisos y roles de servicio recomendados para tu arquitectura cloud.
              </p>
            </div>

            <div className="aws-responsive-grid-4">
              {/* Mini-card 1: Usuarios */}
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <div style={{ width: 30, height: 30, borderRadius: 8, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb' }}>
                    <Users size={16} />
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>Usuarios IAM</div>
                    <span style={{ fontSize: 11, color: '#64748b' }}>Identidades personales</span>
                  </div>
                </div>
                <div style={{ fontSize: 12, color: '#475569', lineHeight: 1.4 }}>
                  Ej. <code>admin-ops</code>, <code>dev-backend</code>, <code>analista-bi</code>. Cada usuario cuenta con credenciales únicas y MFA obligatorio.
                </div>
              </div>

              {/* Mini-card 2: Grupos */}
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <div style={{ width: 30, height: 30, borderRadius: 8, background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#16a34a' }}>
                    <FolderTree size={16} />
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>Grupos IAM</div>
                    <span style={{ fontSize: 11, color: '#64748b' }}>Agrupación por rol laboral</span>
                  </div>
                </div>
                <div style={{ fontSize: 12, color: '#475569', lineHeight: 1.4 }}>
                  Ej. Grupo <code>Desarrolladores</code> con política de solo lectura en S3 y acceso controlado a entornos de staging en EC2.
                </div>
              </div>

              {/* Mini-card 3: Roles */}
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <div style={{ width: 30, height: 30, borderRadius: 8, background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#d97706' }}>
                    <KeyRound size={16} />
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>Roles de Servicio</div>
                    <span style={{ fontSize: 11, color: '#64748b' }}>Tokens temporales STS</span>
                  </div>
                </div>
                <div style={{ fontSize: 12, color: '#475569', lineHeight: 1.4 }}>
                  Ej. Rol <code>EC2-App-Role</code> asignado a servidores de backend para que interactúen con RDS y S3 sin credenciales embebidas en el código.
                </div>
              </div>

              {/* Mini-card 4: Políticas */}
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <div style={{ width: 30, height: 30, borderRadius: 8, background: '#f3e8ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9333ea' }}>
                    <FileCode2 size={16} />
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>Políticas JSON</div>
                    <span style={{ fontSize: 11, color: '#64748b' }}>Documentos de permisos</span>
                  </div>
                </div>
                <div style={{ fontSize: 12, color: '#475569', lineHeight: 1.4 }}>
                  Ej. Política <code>LeastPrivilege-S3-Read</code> que restringe las acciones a <code>s3:GetObject</code> únicamente en el bucket designado.
                </div>
              </div>
            </div>

            {/* Principle of Least Privilege Banner */}
            <div
              style={{
                marginTop: 14,
                padding: '10px 14px',
                background: '#eff6ff',
                border: '1px solid #bfdbfe',
                borderRadius: 8,
                fontSize: 12,
                color: '#1e40af',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <Info size={15} color="#2563eb" style={{ flexShrink: 0 }} />
              <span>
                <strong>Principio de menor privilegio (Least Privilege):</strong> Cada usuario, grupo o rol recibe únicamente los permisos mínimos indispensables para cumplir su labor, eliminando comodines globales (*) y credenciales root.
              </span>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: Compliance & Encryption Controls */}
      {activeTab === 'compliance' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div className="aws-responsive-grid-3">
            <SecurityCard
              title="Cifrado en Tránsito (TLS 1.3)"
              isActive={securityControls.tls13}
              activeDescription="Activo: Certificados SSL/TLS gestionados vía AWS Certificate Manager."
              inactiveDescription="Desactivado: Forzar HTTPS / TLS 1.3"
              points={15}
              onToggle={() => handleToggle('tls13', 'Cifrado en Tránsito TLS 1.3')}
            />
            <SecurityCard
              title="S3 Versioning & Cifrado SSE-KMS"
              isActive={securityControls.s3EncryptionAndVersioning}
              activeDescription="Activo: Protección contra eliminación accidental y ransomware en S3."
              inactiveDescription="Desactivado: Activar versionado y cifrado SSE-KMS"
              points={15}
              applies={hasS3}
              disabledTooltip="Agrega S3 a tu solución"
              onToggle={() => handleToggle('s3EncryptionAndVersioning', 'S3 Versioning & Cifrado SSE-KMS')}
            />
            <SecurityCard
              title="Registro de auditoría con CloudTrail"
              isActive={securityControls.complianceAudits}
              activeDescription="Activo: Registro inmutable de eventos de API y accesos con Amazon CloudTrail."
              inactiveDescription="Desactivado: Habilitar trazabilidad y auditoría de eventos"
              points={10}
              onToggle={() => handleToggle('complianceAudits', 'Registro de auditoría con CloudTrail')}
            />
          </div>

          {/* Informational block: Certificaciones de AWS (Seguridad DE la nube) */}
          <div
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: 14,
              padding: '20px 24px',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 8,
                  background: 'rgba(22, 163, 74, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#16a34a',
                }}
              >
                <Award size={18} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#1e293b' }}>
                  Certificaciones de AWS (Seguridad DE la nube)
                </h3>
                <span style={{ fontSize: 12, color: '#64748b' }}>
                  Acreditaciones y auditorías internacionales de centros de datos globales
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
              {['SOC 1 / SOC 2 / SOC 3', 'ISO 27001 / 27017 / 27018', 'PCI DSS Level 1', 'FedRAMP High', 'HIPAA / HITECH', 'BSI C5 (Alemania)'].map((cert) => (
                <span
                  key={cert}
                  style={{
                    background: '#f8fafc',
                    border: '1px solid #cbd5e1',
                    color: '#334155',
                    fontSize: 12,
                    fontWeight: 700,
                    padding: '4px 10px',
                    borderRadius: 6,
                  }}
                >
                  {cert}
                </span>
              ))}
            </div>

            <div
              style={{
                fontSize: 12.5,
                color: '#475569',
                lineHeight: 1.5,
                background: '#f8fafc',
                padding: '12px 16px',
                borderRadius: 8,
                border: '1px solid #e2e8f0',
              }}
            >
              <strong>Aclaración de Cumplimiento:</strong> Estas certificaciones las obtiene AWS sobre su infraestructura física, hardware y centros de datos. El cliente las consulta y descarga directamente como evidencia para sus auditores en el portal <strong>AWS Artifact</strong> en la consola de AWS.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
