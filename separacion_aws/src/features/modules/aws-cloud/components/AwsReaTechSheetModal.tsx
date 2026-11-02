import { CheckCircle2, Cpu, Download, FileCode2, FileText, Lock, Server, ShieldCheck, X } from 'lucide-react';
import type { CloudProposal, EnterpriseEvaluationResponse } from '../types/awsTypes';
import { exportReaTechSheetPdf } from '../utils/exportReaTechSheetPdf';

interface AwsReaTechSheetModalProps {
  proposal: CloudProposal;
  onClose: () => void;
}

export interface MigrationSecurityControlDetail {
  key: 'rootBlocked' | 'mfaEnforced' | 'ec2Roles' | 'tls13' | 's3EncryptionAndVersioning' | 'complianceAudits';
  title: string;
  domain: string;
  awsService: string;
  points: number;
  active: boolean;
  applies: boolean;
  description: string;
}

export interface MigrationSecuritySummary {
  controls: Record<MigrationSecurityControlDetail['key'], boolean>;
  score: number;
  activeCount: number;
  totalCount: number;
  postureLabel: 'Postura Robusta' | 'Postura Aceptable' | 'Postura Crítica';
  postureColor: string;
  postureBg: string;
  postureBorder: string;
  items: MigrationSecurityControlDetail[];
  iamRolesRecommended: string[];
  complianceStandards: string[];
}

const securityMeta: Omit<MigrationSecurityControlDetail, 'active' | 'applies'>[] = [
  { key: 'rootBlocked', title: 'Cuenta Root Protegida', domain: 'Gobierno de Identidad', awsService: 'AWS IAM / Root Guard', points: 20, description: 'Control persistido para bloquear el uso directo de la cuenta root.' },
  { key: 'mfaEnforced', title: 'MFA Obligatorio en IAM', domain: 'Autenticación Fuerte', awsService: 'AWS IAM MFA / TOTP', points: 20, description: 'Control persistido para exigir autenticación multifactor.' },
  { key: 'ec2Roles', title: 'Roles de Instancia', domain: 'Credenciales de Cómputo', awsService: 'AWS STS / IAM Roles', points: 20, description: 'Aplica cuando la propuesta utiliza EC2 o ECS.' },
  { key: 'tls13', title: 'Cifrado en Tránsito', domain: 'Seguridad de Red', awsService: 'AWS Certificate Manager', points: 15, description: 'Control persistido para proteger las comunicaciones.' },
  { key: 's3EncryptionAndVersioning', title: 'Cifrado y Versionado S3', domain: 'Protección de Datos', awsService: 'Amazon S3 + AWS KMS', points: 15, description: 'Aplica cuando la propuesta utiliza S3.' },
  { key: 'complianceAudits', title: 'Auditoría CloudTrail', domain: 'Trazabilidad', awsService: 'AWS CloudTrail + CloudWatch', points: 10, description: 'Control persistido para auditoría y cumplimiento.' },
];

export function resolveProposalSecurity(prop: CloudProposal): MigrationSecuritySummary {
  const serviceCodes = (prop.selectedServices || prop.services || []).map((service) => service.toLowerCase());
  const hasEc2 = serviceCodes.includes('ec2') || serviceCodes.includes('ecs');
  const hasS3 = serviceCodes.includes('s3');
  const saved = (prop.securityControls || {}) as Record<string, boolean> & { recommended_iam_roles?: string[] };
  const controls = {
    rootBlocked: Boolean(saved.rootBlocked),
    mfaEnforced: Boolean(saved.mfaEnforced),
    ec2Roles: Boolean(saved.ec2Roles),
    tls13: Boolean(saved.tls13),
    s3EncryptionAndVersioning: Boolean(saved.s3EncryptionAndVersioning),
    complianceAudits: Boolean(saved.complianceAudits),
  };
  const items = securityMeta.map((item) => ({
    ...item,
    applies: item.key === 'ec2Roles' ? hasEc2 : item.key === 's3EncryptionAndVersioning' ? hasS3 : true,
    active: controls[item.key] && (item.key !== 'ec2Roles' || hasEc2) && (item.key !== 's3EncryptionAndVersioning' || hasS3),
  }));
  const score = items.reduce((total, item) => total + (item.active ? item.points : 0), 0);
  const postureLabel = score >= 80 ? 'Postura Robusta' : score >= 40 ? 'Postura Aceptable' : 'Postura Crítica';
  return {
    controls,
    score,
    activeCount: items.filter((item) => item.active).length,
    totalCount: items.length,
    postureLabel,
    postureColor: score >= 80 ? '#16a34a' : score >= 40 ? '#d97706' : '#dc2626',
    postureBg: score >= 80 ? '#f0fdf4' : score >= 40 ? '#fffbeb' : '#fef2f2',
    postureBorder: score >= 80 ? '#bbf7d0' : score >= 40 ? '#fde68a' : '#fecaca',
    items,
    iamRolesRecommended: (saved as any).recommended_iam_roles || [],
    complianceStandards: [],
  };
}

export function resolveReaEvaluation(prop: CloudProposal): EnterpriseEvaluationResponse {
  return prop.reaEvaluation || {
    status: 'error',
    origin_detected: 'Sin evaluación REA registrada',
    detected_configs: [],
    system_description: 'No hay una descripción general disponible para esta evaluación.',
    system_analysis: 'La propuesta todavía no tiene una evaluación REA persistida en el backend.',
    architecture_pattern: 'Sin evaluación',
    migration_strategy: 'Pendiente',
    well_architected_notes: [],
    technical_evidence: { languages: [], frameworks: [], databases: [], has_docker: false, total_files: 0 },
    scenarios: [],
  };
}

export default function AwsReaTechSheetModal({ proposal, onClose }: AwsReaTechSheetModalProps) {
  const reaData = resolveReaEvaluation(proposal);
  const security = resolveProposalSecurity(proposal);
  const activeScenario = reaData.scenarios.find((scenario) => scenario.scenario_type === proposal.appliedScenario) || reaData.scenarios[0];

  const downloadJson = () => {
    const blob = new Blob([JSON.stringify({ proposal, reaEvaluation: reaData, security }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `ficha-tecnica-rea-${proposal.id}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,.72)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, padding: 20 }}>
      <div onClick={(event) => event.stopPropagation()} style={{ background: '#fff', borderRadius: 18, width: '100%', maxWidth: 900, maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 25px 60px -12px rgba(0,0,0,.35)' }}>
        <header style={{ background: 'linear-gradient(135deg,#0f172a,#1e293b)', color: '#fff', padding: '20px 26px', display: 'flex', justifyContent: 'space-between', gap: 16 }}>
          <div><div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}><span style={{ background: '#2563eb', padding: '3px 10px', borderRadius: 999, fontSize: 11, fontWeight: 800 }}>FICHA TÉCNICA · EVALUACIÓN REA</span><span style={{ color: '#93c5fd', fontSize: 11 }}>{reaData.status === 'success' ? 'Respuesta del backend' : 'Evaluación pendiente'}</span></div><h2 style={{ margin: 0, fontSize: 21 }}>{proposal.solutionName}</h2><p style={{ margin: '4px 0 0', fontSize: 12.5, color: '#cbd5e1' }}>{proposal.region} · {proposal.appType} · {proposal.availabilityLevel}</p></div>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}><button type="button" onClick={() => exportReaTechSheetPdf(proposal, reaData, security)} style={{ background: '#2563eb', border: 0, color: '#fff', borderRadius: 8, padding: '7px 13px', fontWeight: 700, cursor: 'pointer' }}><FileText size={14} /> PDF</button><button type="button" onClick={onClose} style={{ background: 'rgba(255,255,255,.1)', border: 0, color: '#cbd5e1', borderRadius: 8, padding: 6, cursor: 'pointer' }}><X size={18} /></button></div>
        </header>

        <main style={{ padding: '22px 26px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 18 }}>
          <section style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 12, padding: '14px 18px' }}><div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}><FileText size={16} color="#2563eb" /><strong>Descripción general del sistema</strong></div><p style={{ margin: 0, fontSize: 13, color: '#1e3a8a', lineHeight: 1.55 }}>{reaData.system_description || reaData.system_analysis}</p></section>
          <section style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: '14px 18px' }}><div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}><Cpu size={16} color="#2563eb" /><strong>Dictamen del motor REA</strong></div><p style={{ margin: 0, fontSize: 13, color: '#334155', lineHeight: 1.55 }}>{reaData.system_analysis}</p></section>

          <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))', gap: 10 }}>{[['Origen', reaData.origin_detected], ['Arquitectura', reaData.architecture_pattern], ['Seguridad', `${security.score}/100 · ${security.postureLabel}`], ['Presupuesto', `$${proposal.monthlyBudget.toFixed(2)}/mes`]].map(([label, value]) => <div key={label} style={{ border: '1px solid #e2e8f0', borderRadius: 10, padding: '10px 14px' }}><span style={{ display: 'block', fontSize: 11, color: '#64748b', fontWeight: 600 }}>{label}</span><strong style={{ fontSize: 13 }}>{value}</strong></div>)}</section>

          <section style={{ border: '1px solid #cbd5e1', borderRadius: 14, padding: '16px 18px' }}><div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}><Lock size={16} color="#2563eb" /><strong>Seguridad IAM persistida</strong><span style={{ marginLeft: 'auto', color: security.postureColor, fontWeight: 800 }}>{security.score}/100</span></div><div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(245px,1fr))', gap: 10 }}>{security.items.map((item) => <div key={item.key} style={{ background: item.active ? '#f0fdf4' : '#fffbeb', border: `1px solid ${item.active ? '#bbf7d0' : '#fde68a'}`, borderRadius: 10, padding: 10 }}><strong style={{ fontSize: 12.5 }}>{item.title}</strong><div style={{ color: '#2563eb', fontSize: 11, fontWeight: 700 }}>{item.awsService}</div><p style={{ margin: '4px 0 0', fontSize: 11.5, color: '#475569' }}>{item.active ? 'Activo en la propuesta.' : item.applies ? 'Pendiente en la propuesta.' : 'No aplica a sus servicios.'}</p></div>)}</div></section>

          {activeScenario && <section><div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10 }}><Server size={16} color="#2563eb" /><strong>Servicios y costos recibidos del backend</strong></div><div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: 12 }}><table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}><thead><tr style={{ background: '#f1f5f9', textAlign: 'left' }}><th style={{ padding: 10 }}>Servicio</th><th style={{ padding: 10 }}>Especificación</th><th style={{ padding: 10, textAlign: 'right' }}>Costo/mes</th></tr></thead><tbody>{activeScenario.services.map((service) => <tr key={`${service.service_code}-${service.service_name}`} style={{ borderTop: '1px solid #e2e8f0' }}><td style={{ padding: 10 }}><strong>{service.service_name}</strong><div style={{ color: '#64748b', fontSize: 11 }}>{service.category}</div></td><td style={{ padding: 10 }}>{service.quantity}x · {service.specs}</td><td style={{ padding: 10, textAlign: 'right', fontWeight: 800 }}>${service.total_monthly_usd.toFixed(2)}</td></tr>)}</tbody></table></div></section>}

          {reaData.scenarios.length > 0 && <section><div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10 }}><ShieldCheck size={16} color="#16a34a" /><strong>Escenarios financieros del backend</strong></div><div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 10 }}>{reaData.scenarios.map((scenario) => <div key={scenario.scenario_type} style={{ border: '1px solid #e2e8f0', borderRadius: 10, padding: 12 }}><strong>{scenario.scenario_type.replace(/-/g, ' ')}</strong><div style={{ color: '#1d4ed8', fontSize: 17, fontWeight: 800, marginTop: 5 }}>${scenario.pricing.monthly_total_usd.toFixed(2)} <small>USD/mes</small></div></div>)}</div></section>}

          {reaData.detected_configs.length > 0 && <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', fontSize: 12, color: '#64748b' }}><FileCode2 size={14} />Artefactos analizados:{reaData.detected_configs.map((config) => <code key={config}>{config}</code>)}</div>}
        </main>
        <footer style={{ padding: '14px 26px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}><span style={{ fontSize: 12, color: '#64748b', display: 'flex', gap: 6, alignItems: 'center' }}><CheckCircle2 size={14} color="#16a34a" />Datos persistidos y validados por el backend</span><div style={{ display: 'flex', gap: 8 }}><button type="button" onClick={downloadJson} style={{ background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1d4ed8', borderRadius: 8, padding: '8px 14px', fontWeight: 700, cursor: 'pointer' }}><Download size={14} /> JSON</button><button type="button" onClick={onClose} style={{ background: '#0f172a', border: 0, color: '#fff', borderRadius: 8, padding: '8px 18px', fontWeight: 700, cursor: 'pointer' }}>Cerrar</button></div></footer>
      </div>
    </div>
  );
}
