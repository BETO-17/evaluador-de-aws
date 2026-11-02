import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Server,
  DollarSign,
  ShieldCheck,
  Globe,
  ArrowRight,
  Layers,
  PieChart,
  Zap,
  CheckCircle,
  PlusCircle,
  Info,
  X,
  Activity,
  Check,
  TrendingUp,
  Sliders,
  FileText,
} from 'lucide-react';
import AwsStatCard from '../components/AwsStatCard';
import { useAws } from '../context/AwsContext';
import '../aws.css';

type ModalType = 'costs' | 'services' | 'sla' | 'security' | null;

const CATEGORY_COLOR_MAP: Record<string, string> = {
  'Cómputo': '#2563eb',
  'Base de Datos': '#06b6d4',
  'Almacenamiento': '#3b82f6',
  'Redes y CDN': '#0284c7',
  'Serverless': '#8b5cf6',
  'Seguridad e Identidad': '#6366f1',
  'Monitoreo y Gestión': '#64748b',
};

const COLOR_PALETTE_FALLBACK = [
  '#2563eb', '#06b6d4', '#3b82f6', '#0284c7', '#8b5cf6',
  '#6366f1', '#64748b', '#10b981', '#14b8a6', '#0ea5e9',
];

export default function AwsDashboard() {
  const navigate = useNavigate();
  const {
    totalMonthlyCost,
    totalAnnualCost,
    deployedServices,
    slaPercent,
    securityScore,
    securityControls,
    toggleSecurityControl,
    activeProposal,
    costItems,
    selectedRegion,
    serviceCatalog,
    regions,
  } = useAws();

  // Interactive States
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [costPeriod, setCostPeriod] = useState<'monthly' | 'annual'>('monthly');
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);
  const [proposalTab, setProposalTab] = useState<'overview' | 'services' | 'simulator'>('overview');
  const [simulatedUsers, setSimulatedUsers] = useState<number>(
    activeProposal?.estimatedUsers || 5000
  );
  const [selectedServiceChip, setSelectedServiceChip] = useState<string | null>(null);

  const hasServices = deployedServices.length > 0;
  const hasCostItems = costItems.length > 0;

  // Selected Service Detail for Mini Chip
  const activeChipService = selectedServiceChip
    ? serviceCatalog.find(
        (s) =>
          s.codeName.toLowerCase() === selectedServiceChip.toLowerCase() ||
          s.name.toLowerCase().includes(selectedServiceChip.toLowerCase())
      )
    : null;

  // Region derived from activeProposal or selectedRegion
  const displayRegion = activeProposal
    ? activeProposal.region
    : (selectedRegion !== 'Sin región' ? selectedRegion : '');
  const regionCode = displayRegion ? (displayRegion.split(' ')[0] || displayRegion) : 'Sin definir';
  const regionLocation = displayRegion && displayRegion.includes('(')
    ? displayRegion.split('(')[1].replace(')', '')
    : (displayRegion ? displayRegion : 'Sin definir');

  // Group items strictly by Category
  const baseTotal = costPeriod === 'monthly' ? totalMonthlyCost : totalAnnualCost;

  const groupedCatMap: Record<string, number> = {};
  costItems.forEach((item) => {
    const amount = costPeriod === 'monthly' ? item.monthlyCost : item.monthlyCost * 12;
    groupedCatMap[item.category] = (groupedCatMap[item.category] || 0) + amount;
  });

  const sortedCategories = Object.entries(groupedCatMap)
    .map(([cat, amount]) => ({ cat, amount }))
    .sort((a, b) => b.amount - a.amount);

  const radius = 70;
  const circumference = 2 * Math.PI * radius; // ~439.82

  let accumulatedPercent = 0;
  const donutSlices = sortedCategories.map((item, index) => {
    const percent = baseTotal > 0 ? (item.amount / baseTotal) * 100 : 0;
    const strokeDasharray = `${(percent / 100) * circumference} ${circumference}`;
    const strokeDashoffset = -((accumulatedPercent / 100) * circumference);
    accumulatedPercent += percent;

    return {
      cat: item.cat,
      amount: item.amount,
      percent,
      color: CATEGORY_COLOR_MAP[item.cat] || COLOR_PALETTE_FALLBACK[index % COLOR_PALETTE_FALLBACK.length],
      strokeDasharray,
      strokeDashoffset,
    };
  });

  // Active hovered slice details
  const activeHoveredSlice = hoveredCategory
    ? donutSlices.find((s) => s.cat === hoveredCategory)
    : null;

  return (
    <div className="aws-container">
      {/* 1. Page Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 4 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800, margin: '0 0 4px', color: '#1e293b', letterSpacing: '-0.3px' }}>
            Dashboard
          </h1>
          <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>
            Panel unificado interactivo para la gestión de arquitectura, costos y seguridad cloud.
          </p>
        </div>
        {hasServices && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: '#16a34a',
                background: 'rgba(22, 163, 74, 0.1)',
                padding: '4px 12px',
                borderRadius: 20,
                border: '1px solid rgba(22, 163, 74, 0.25)',
              }}
            >
              ● Arquitectura Activa ({deployedServices.length} servicios)
            </span>
          </div>
        )}
      </div>

      {/* 2. 4 Key Stat Cards with Interactive Drill-Down Modals */}
      <div className="aws-responsive-grid-4">
        <AwsStatCard
          title="Costo Mensual Estimado"
          value={`$${totalMonthlyCost.toFixed(2)}`}
          subtitle={totalMonthlyCost > 0 ? `Proyección anual: $${totalAnnualCost.toFixed(2)}` : '$0.00'}
          trend={totalMonthlyCost > 0 ? `${costItems.length} ítems cotizados` : 'Sin definir'}
          trendPositive={totalMonthlyCost > 0}
          icon={DollarSign}
          iconColor="#f59e0b"
          iconBg="rgba(245, 158, 11, 0.12)"
          onClick={() => setActiveModal('costs')}
          clickableHint="Ver Desglose ↗"
        />

        <AwsStatCard
          title="Servicios AWS en Solución"
          value={hasServices ? `${deployedServices.length} Servicios` : 'Sin definir'}
          subtitle={hasServices ? deployedServices.slice(0, 4).join(', ') + (deployedServices.length > 4 ? '...' : '') : 'Sin definir'}
          badgeText={hasServices ? 'Well-Architected' : 'Sin definir'}
          badgeType={hasServices ? 'success' : 'neutral'}
          icon={Server}
          iconColor="#2563eb"
          iconBg="rgba(37, 99, 235, 0.1)"
          onClick={() => setActiveModal('services')}
          clickableHint="Ver Fichas ↗"
        />

        <AwsStatCard
          title="Región de Despliegue"
          value={regionCode}
          subtitle={regionLocation}
          badgeText={activeProposal ? (hasServices ? 'En uso' : 'Requiere revisión') : 'Sin definir'}
          badgeType={activeProposal ? (hasServices ? 'success' : 'warning') : 'neutral'}
          icon={Globe}
          iconColor="#059669"
          iconBg="rgba(16, 185, 129, 0.12)"
          onClick={() => navigate('/modules/aws/infrastructure')}
          clickableHint="Ver Mapa ↗"
        />

        <AwsStatCard
          title="Postura de Seguridad (IAM/KMS)"
          value={securityScore > 0 ? `${securityScore} / 100` : 'Sin definir'}
          subtitle="Controles y políticas activas"
          badgeText={securityScore >= 80 ? 'Correcto' : securityScore > 0 ? 'Requiere revisión' : 'Sin definir'}
          badgeType={securityScore >= 80 ? 'success' : securityScore > 0 ? 'warning' : 'neutral'}
          icon={ShieldCheck}
          iconColor="#16a34a"
          iconBg="rgba(22, 163, 74, 0.12)"
          onClick={() => setActiveModal('security')}
          clickableHint="Checklist ↗"
        />
      </div>

      {/* 3. Split View: Interactive Proposal Card & Cost Economics Chart */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.15fr) minmax(0, 1.15fr)', gap: 20 }}>
        {/* Proposal Summary Card with Interactive Tabs */}
        {activeProposal ? (
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 16, padding: 24, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', boxShadow: '0 2px 10px rgba(0,0,0,0.03)' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <span style={{ fontSize: 11.5, fontWeight: 700, padding: '3px 10px', borderRadius: 12, background: 'rgba(37, 99, 235, 0.1)', color: '#2563eb' }}>
                  Propuesta Cloud Activa
                </span>
                <span style={{ fontSize: 12, color: '#16a34a', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <CheckCircle size={13} /> {activeProposal.status}
                </span>
              </div>

              <h3 style={{ fontSize: 18, fontWeight: 800, color: '#1e293b', margin: '0 0 6px' }}>
                {activeProposal.solutionName}
              </h3>
              <p style={{ fontSize: 13, color: '#64748b', lineHeight: 1.5, margin: '0 0 14px' }}>
                {activeProposal.description}
              </p>

              {/* Interactive Tabs within Proposal */}
              <div style={{ display: 'flex', gap: 6, borderBottom: '1px solid #e2e8f0', paddingBottom: 8, marginBottom: 14 }}>
                <button
                  onClick={() => setProposalTab('overview')}
                  style={{
                    padding: '5px 12px',
                    borderRadius: 8,
                    fontSize: 12,
                    fontWeight: 700,
                    border: 'none',
                    cursor: 'pointer',
                    background: proposalTab === 'overview' ? '#eff6ff' : 'transparent',
                    color: proposalTab === 'overview' ? '#2563eb' : '#64748b',
                  }}
                >
                  Visión General
                </button>
                <button
                  onClick={() => setProposalTab('services')}
                  style={{
                    padding: '5px 12px',
                    borderRadius: 8,
                    fontSize: 12,
                    fontWeight: 700,
                    border: 'none',
                    cursor: 'pointer',
                    background: proposalTab === 'services' ? '#eff6ff' : 'transparent',
                    color: proposalTab === 'services' ? '#2563eb' : '#64748b',
                  }}
                >
                  Servicios & Tags ({activeProposal.selectedServices.length})
                </button>
                <button
                  onClick={() => setProposalTab('simulator')}
                  style={{
                    padding: '5px 12px',
                    borderRadius: 8,
                    fontSize: 12,
                    fontWeight: 700,
                    border: 'none',
                    cursor: 'pointer',
                    background: proposalTab === 'simulator' ? '#eff6ff' : 'transparent',
                    color: proposalTab === 'simulator' ? '#2563eb' : '#64748b',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <Sliders size={13} />
                  <span>Simulador de Carga</span>
                </button>
              </div>

              {/* Tab 1: Overview */}
              {proposalTab === 'overview' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, background: '#f8fafc', padding: 14, borderRadius: 10, border: '1px solid #e2e8f0', marginBottom: 14 }}>
                  <div>
                    <span style={{ fontSize: 11.5, color: '#64748b' }}>Tipo de Aplicación:</span>
                    <div style={{ fontWeight: 700, color: '#1e293b', fontSize: 13 }}>{activeProposal.appType}</div>
                  </div>
                  <div>
                    <span style={{ fontSize: 11.5, color: '#64748b' }}>Usuarios Estimados:</span>
                    <div style={{ fontWeight: 700, color: '#1e293b', fontSize: 13 }}>{activeProposal.estimatedUsers.toLocaleString()} concurrentes</div>
                  </div>
                  <div>
                    <span style={{ fontSize: 11.5, color: '#64748b' }}>Objetivo de Migración:</span>
                    <div style={{ fontWeight: 700, color: '#2563eb', fontSize: 13 }}>{activeProposal.migrationGoal}</div>
                  </div>
                  <div>
                    <span style={{ fontSize: 11.5, color: '#64748b' }}>Región de Despliegue:</span>
                    <div style={{ fontWeight: 700, color: '#1e293b', fontSize: 13 }}>{activeProposal.region}</div>
                  </div>
                </div>
              )}

              {/* Tab 2: Interactive Services Chips */}
              {proposalTab === 'services' && (
                <div style={{ marginBottom: 14 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 8 }}>
                    Haz clic en un servicio para ver su ficha técnica:
                  </span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                    {activeProposal.selectedServices.map((svc) => {
                      const isSelected = selectedServiceChip === svc;
                      return (
                        <button
                          key={svc}
                          onClick={() => setSelectedServiceChip(isSelected ? null : svc)}
                          style={{
                            background: isSelected ? '#2563eb' : '#eff6ff',
                            color: isSelected ? '#ffffff' : '#1d4ed8',
                            border: `1px solid ${isSelected ? '#1d4ed8' : '#bfdbfe'}`,
                            padding: '4px 10px',
                            borderRadius: 6,
                            fontSize: 11.5,
                            fontWeight: 700,
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          AWS {svc}
                        </button>
                      );
                    })}
                  </div>

                  {activeChipService && (
                    <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: 8, padding: 10, fontSize: 12, color: '#334155' }}>
                      <div style={{ fontWeight: 700, color: '#0f172a', marginBottom: 2 }}>{activeChipService.name} ({activeChipService.category})</div>
                      <p style={{ margin: 0, fontSize: 11.5, color: '#64748b' }}>{activeChipService.description}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Tab 3: Interactive Load & Traffic Simulator */}
              {proposalTab === 'simulator' && (
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: 14, marginBottom: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#1e293b' }}>
                      Simular Usuarios Concurrentes:
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 800, color: '#2563eb' }}>
                      {simulatedUsers.toLocaleString()} usuarios
                    </span>
                  </div>

                  <input
                    type="range"
                    min="1000"
                    max="100000"
                    step="1000"
                    value={simulatedUsers}
                    onChange={(e) => setSimulatedUsers(Number(e.target.value))}
                    style={{ width: '100%', accentColor: '#2563eb', cursor: 'pointer', marginBottom: 12 }}
                  />

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, textAlign: 'center' }}>
                    <div style={{ background: '#ffffff', padding: 8, borderRadius: 6, border: '1px solid #e2e8f0' }}>
                      <span style={{ fontSize: 10.5, color: '#64748b', display: 'block' }}>RPS Estimado</span>
                      <strong style={{ fontSize: 12, color: '#059669' }}>{~~(simulatedUsers / 10)} req/s</strong>
                    </div>
                    <div style={{ background: '#ffffff', padding: 8, borderRadius: 6, border: '1px solid #e2e8f0' }}>
                      <span style={{ fontSize: 10.5, color: '#64748b', display: 'block' }}>Instancias EC2</span>
                      <strong style={{ fontSize: 12, color: '#2563eb' }}>{Math.max(2, Math.ceil(simulatedUsers / 15000))} Nodos</strong>
                    </div>
                    <div style={{ background: '#ffffff', padding: 8, borderRadius: 6, border: '1px solid #e2e8f0' }}>
                      <span style={{ fontSize: 10.5, color: '#64748b', display: 'block' }}>Costo Proyectado</span>
                      <strong style={{ fontSize: 12, color: '#d97706' }}>
                        ${(totalMonthlyCost * (simulatedUsers / (activeProposal.estimatedUsers || 5000))).toFixed(0)}/m
                      </strong>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 12, color: '#64748b' }}>Registrado el: {activeProposal.createdAt}</span>
              <button
                className="aws-btn-action"
                onClick={() => navigate('/modules/aws/planning')}
              >
                <span>Gestionar Planificación</span>
                <ArrowRight size={13} />
              </button>
            </div>
          </div>
        ) : (
          /* Empty State: No Proposals */
          <div
            style={{
              background: '#ffffff',
              border: '2px dashed #cbd5e1',
              borderRadius: 16,
              padding: 32,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              gap: 14,
            }}
          >
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(37, 99, 235, 0.1)', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <PlusCircle size={26} />
            </div>
            <div>
              <h3 style={{ fontSize: 17, fontWeight: 800, color: '#1e293b', margin: '0 0 6px' }}>
                No hay propuestas cloud registradas
              </h3>
              <p style={{ fontSize: 13, color: '#64748b', margin: 0, maxWidth: 360, lineHeight: 1.5 }}>
                Inicia diseñando tu primera arquitectura en el Módulo de Planificación para estructurar la solución y sus servicios.
              </p>
            </div>
            <button
              onClick={() => navigate('/modules/aws/planning')}
              style={{
                background: '#2563eb',
                color: '#ffffff',
                border: 'none',
                borderRadius: 8,
                padding: '9px 18px',
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)',
              }}
            >
              <PlusCircle size={15} /> Crear Primera Propuesta Cloud
            </button>
          </div>
        )}

        {/* 4. Cost & Economics Premium SaaS Widget (By Category) */}
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: 16,
            padding: 24,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
            minHeight: 380,
          }}
        >
          <div>
            {/* Widget Header with Period Toggle */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 8 }}>
                <PieChart size={19} color="#f59e0b" />
                <span>Distribución de Costos por Categoría</span>
              </h3>

              {/* Period Switcher: Mensual / Anual */}
              <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: 8, padding: 2, opacity: hasCostItems ? 1 : 0.5 }}>
                <button
                  disabled={!hasCostItems}
                  onClick={() => setCostPeriod('monthly')}
                  style={{
                    padding: '4px 12px',
                    fontSize: 11.5,
                    fontWeight: 700,
                    border: 'none',
                    borderRadius: 6,
                    cursor: hasCostItems ? 'pointer' : 'not-allowed',
                    background: costPeriod === 'monthly' ? '#ffffff' : 'transparent',
                    color: costPeriod === 'monthly' ? '#2563eb' : '#64748b',
                    boxShadow: costPeriod === 'monthly' ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                    transition: 'all 0.15s ease',
                  }}
                >
                  Mensual
                </button>
                <button
                  disabled={!hasCostItems}
                  onClick={() => setCostPeriod('annual')}
                  style={{
                    padding: '4px 12px',
                    fontSize: 11.5,
                    fontWeight: 700,
                    border: 'none',
                    borderRadius: 6,
                    cursor: hasCostItems ? 'pointer' : 'not-allowed',
                    background: costPeriod === 'annual' ? '#ffffff' : 'transparent',
                    color: costPeriod === 'annual' ? '#2563eb' : '#64748b',
                    boxShadow: costPeriod === 'annual' ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                    transition: 'all 0.15s ease',
                  }}
                >
                  Anual (x12)
                </button>
              </div>
            </div>

            {hasCostItems ? (
              /* High Impact Layout: Prominent Big Donut (Left) + Clean List by Category (Right) */
              <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', alignItems: 'center', gap: 28, padding: '6px 0 10px' }}>
                {/* 1. Large Hero SVG Donut Chart */}
                <div style={{ position: 'relative', width: 220, height: 220, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="220" height="220" viewBox="0 0 180 180" style={{ transform: 'rotate(-90deg)', overflow: 'visible' }}>
                    {/* Background Ring Track */}
                    <circle
                      cx="90"
                      cy="90"
                      r={radius}
                      fill="transparent"
                      stroke="#f1f5f9"
                      strokeWidth="24"
                    />
                    {/* Interactive Donut Slices */}
                    {donutSlices.map((slice) => {
                      const isHovered = hoveredCategory === slice.cat;
                      return (
                        <circle
                          key={slice.cat}
                          cx="90"
                          cy="90"
                          r={radius}
                          fill="transparent"
                          stroke={slice.color}
                          strokeWidth={isHovered ? 28 : 24}
                          strokeDasharray={slice.strokeDasharray}
                          strokeDashoffset={slice.strokeDashoffset}
                          strokeLinecap="butt"
                          onMouseEnter={() => setHoveredCategory(slice.cat)}
                          onMouseLeave={() => setHoveredCategory(null)}
                          style={{
                            transition: 'stroke-width 0.2s cubic-bezier(0.16, 1, 0.3, 1), filter 0.2s ease',
                            cursor: 'pointer',
                            filter: isHovered ? 'brightness(1.1) drop-shadow(0 0 10px rgba(0,0,0,0.25))' : 'none',
                          }}
                        />
                      );
                    })}
                  </svg>

                  {/* Clean Center Typography */}
                  <div
                    style={{
                      position: 'absolute',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      textAlign: 'center',
                      pointerEvents: 'none',
                      maxWidth: 130,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 800,
                        color: activeHoveredSlice ? activeHoveredSlice.color : '#64748b',
                        textTransform: 'uppercase',
                        letterSpacing: '0.6px',
                        marginBottom: 2,
                        transition: 'color 0.15s ease',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        maxWidth: 120,
                      }}
                    >
                      {activeHoveredSlice ? activeHoveredSlice.cat : 'TOTAL ESTIMADO'}
                    </span>

                    <div
                      style={{
                        fontSize: 21,
                        fontWeight: 900,
                        color: activeHoveredSlice ? activeHoveredSlice.color : '#0f172a',
                        letterSpacing: '-0.5px',
                        lineHeight: 1.15,
                        transition: 'color 0.15s ease',
                      }}
                    >
                      {activeHoveredSlice
                        ? `$${activeHoveredSlice.amount.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
                        : `$${baseTotal >= 1000 ? (baseTotal / 1000).toFixed(1) + 'K' : baseTotal.toFixed(0)}`}
                    </div>

                    <div
                      style={{
                        fontSize: 11.5,
                        color: '#64748b',
                        fontWeight: 600,
                        marginTop: 2,
                      }}
                    >
                      {activeHoveredSlice
                        ? `${activeHoveredSlice.percent.toFixed(0)}% del total`
                        : `${baseTotal.toLocaleString(undefined, { maximumFractionDigits: 0 })} USD`}
                    </div>
                  </div>
                </div>

                {/* 2. Structured Clean 2-Line Legend strictly by Category */}
                <div className="aws-legend-scroll" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {donutSlices.map((slice) => {
                    const isHovered = hoveredCategory === slice.cat;
                    return (
                      <div
                        key={slice.cat}
                        onMouseEnter={() => setHoveredCategory(slice.cat)}
                        onMouseLeave={() => setHoveredCategory(null)}
                        style={{
                          cursor: 'pointer',
                          opacity: hoveredCategory && !isHovered ? 0.4 : 1,
                          transition: 'opacity 0.2s ease, transform 0.15s ease',
                          transform: isHovered ? 'translateX(4px)' : 'none',
                        }}
                      >
                        {/* Line 1: Dot + Category Title in Category Color */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 2 }}>
                          <span
                            style={{
                              width: 10,
                              height: 10,
                              borderRadius: '50%',
                              background: slice.color,
                              flexShrink: 0,
                              boxShadow: isHovered ? `0 0 10px ${slice.color}` : 'none',
                              transition: 'box-shadow 0.2s ease',
                            }}
                          />
                          <span
                            style={{
                              fontSize: 13.5,
                              fontWeight: 700,
                              color: isHovered ? slice.color : '#1e293b',
                              transition: 'color 0.15s ease',
                            }}
                          >
                            {slice.cat}
                          </span>
                        </div>

                        {/* Line 2: Percentage • Formatted Amount / Period */}
                        <div style={{ fontSize: 12, color: '#64748b', fontWeight: 500, paddingLeft: 20 }}>
                          <strong style={{ color: '#1e293b', fontWeight: 700 }}>
                            {slice.percent.toFixed(0)}%
                          </strong>
                          <span style={{ margin: '0 8px', color: '#cbd5e1' }}>•</span>
                          <span>
                            ${slice.amount.toLocaleString(undefined, { maximumFractionDigits: 0 })}{' '}
                            {costPeriod === 'monthly' ? '/ mes' : '/ año'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              /* Empty state for costs */
              <div
                style={{
                  padding: '36px 16px',
                  background: '#f8fafc',
                  border: '1px dashed #cbd5e1',
                  borderRadius: 12,
                  textAlign: 'center',
                  margin: '16px 0',
                }}
              >
                <Info size={28} style={{ color: '#94a3b8', margin: '0 auto 8px' }} />
                <div style={{ fontSize: 14, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                  Calculadora sin ítems cotizados
                </div>
                <p style={{ fontSize: 12.5, color: '#64748b', margin: 0, maxWidth: 300, marginInline: 'auto' }}>
                  Agrega servidores, bases de datos o almacenamiento para visualizar la distribución del presupuesto.
                </p>
              </div>
            )}
          </div>

          {/* Widget Footer */}
          <div style={{ paddingTop: 14, borderTop: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 12, color: '#64748b', fontWeight: 500 }}>
              {hasCostItems ? `${donutSlices.length} categorías activas` : 'Simulador Pricing Calculator'}
            </span>
            <button
              className="aws-btn-secondary"
              onClick={() => navigate('/modules/aws/costs')}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700 }}
            >
              <span>Ver Calculadora</span>
              <ArrowRight size={13} />
            </button>
          </div>
        </div>
      </div>

      {/* 5. Enhanced Quick Access Cards with Hover Lift */}
      <div className="aws-responsive-grid-4">
        <div
          className="aws-quick-card quick-planning"
          onClick={() => navigate('/modules/aws/planning')}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <FileText size={18} color="#2563eb" />
              <strong style={{ fontSize: 14, color: '#1e293b' }}>Planificación Cloud</strong>
            </div>
            <ArrowRight size={14} className="quick-arrow" color="#2563eb" />
          </div>
          <p style={{ margin: 0, fontSize: 12, color: '#64748b' }}>
            Diseña propuestas y define los requisitos de arquitectura.
          </p>
        </div>

        <div
          className="aws-quick-card quick-costs"
          onClick={() => navigate('/modules/aws/costs')}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <DollarSign size={18} color="#f59e0b" />
              <strong style={{ fontSize: 14, color: '#1e293b' }}>Costos y Economía Cloud</strong>
            </div>
            <ArrowRight size={14} className="quick-arrow" color="#f59e0b" />
          </div>
          <p style={{ margin: 0, fontSize: 12, color: '#64748b' }}>
            Calcula y proyecta el presupuesto mensual de tu arquitectura.
          </p>
        </div>

        <div
          className="aws-quick-card quick-infra"
          onClick={() => navigate('/modules/aws/infrastructure')}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Globe size={18} color="#059669" />
              <strong style={{ fontSize: 14, color: '#1e293b' }}>Infraestructura Global</strong>
            </div>
            <ArrowRight size={14} className="quick-arrow" color="#059669" />
          </div>
          <p style={{ margin: 0, fontSize: 12, color: '#64748b' }}>
            {regions.length} Regiones geográficas y Zonas de Disponibilidad (AZs).
          </p>
        </div>

        <div
          className="aws-quick-card quick-sec"
          onClick={() => navigate('/modules/aws/security')}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <ShieldCheck size={18} color="#16a34a" />
              <strong style={{ fontSize: 14, color: '#1e293b' }}>Seguridad e IAM</strong>
            </div>
            <ArrowRight size={14} className="quick-arrow" color="#16a34a" />
          </div>
          <p style={{ margin: 0, fontSize: 12, color: '#64748b' }}>
            Modelo de Responsabilidad Compartida y postura de seguridad.
          </p>
        </div>

        <div
          className="aws-quick-card quick-network"
          onClick={() => navigate('/modules/aws/network')}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Layers size={18} color="#2563eb" />
              <strong style={{ fontSize: 14, color: '#1e293b' }}>Arquitectura de Red</strong>
            </div>
            <ArrowRight size={14} className="quick-arrow" color="#2563eb" />
          </div>
          <p style={{ margin: 0, fontSize: 12, color: '#64748b' }}>
            Diagrama interactivo de flujo de paquetes en Amazon VPC.
          </p>
        </div>

        <div
          className="aws-quick-card quick-catalog"
          onClick={() => navigate('/modules/aws/services')}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Zap size={18} color="#7c3aed" />
              <strong style={{ fontSize: 14, color: '#1e293b' }}>Catálogo de Servicios</strong>
            </div>
            <ArrowRight size={14} className="quick-arrow" color="#7c3aed" />
          </div>
          <p style={{ margin: 0, fontSize: 12, color: '#64748b' }}>
            Servicios clasificados por categorías arquitectónicas.
          </p>
        </div>
      </div>

      {/* =========================================================
          INTERACTIVE DRILL-DOWN MODALS
          ========================================================= */}

      {/* Modal 1: Desglose de Costos */}
      {activeModal === 'costs' && (
        <div className="aws-modal-overlay" onClick={() => setActiveModal(null)}>
          <div className="aws-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="aws-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <DollarSign size={20} color="#f59e0b" />
                <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: '#0f172a' }}>
                  Desglose de Costos & Optimización
                </h3>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={18} />
              </button>
            </div>

            <div className="aws-modal-body">
              <div style={{ display: 'flex', justifyContent: 'space-between', background: '#f8fafc', padding: 12, borderRadius: 10, marginBottom: 16 }}>
                <div>
                  <span style={{ fontSize: 11.5, color: '#64748b' }}>Total Mensual</span>
                  <div style={{ fontSize: 20, fontWeight: 800, color: '#059669' }}>${totalMonthlyCost.toFixed(2)}</div>
                </div>
                <div>
                  <span style={{ fontSize: 11.5, color: '#64748b' }}>Total Anual Proyectado</span>
                  <div style={{ fontSize: 20, fontWeight: 800, color: '#1e293b' }}>${totalAnnualCost.toFixed(2)}</div>
                </div>
              </div>

              <h4 style={{ fontSize: 13, fontWeight: 700, color: '#334155', margin: '0 0 10px' }}>
                Ítems Cotizados en la Arquitectura:
              </h4>

              {hasCostItems ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 220, overflowY: 'auto' }}>
                  {costItems.map((item) => (
                    <div
                      key={item.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 12px',
                        background: '#ffffff',
                        border: '1px solid #e2e8f0',
                        borderRadius: 8,
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 13, color: '#1e293b' }}>{item.serviceName}</div>
                        <span style={{ fontSize: 11, color: '#64748b' }}>{item.category} • {item.instanceTypeOrTier}</span>
                      </div>
                      <span style={{ fontWeight: 800, fontSize: 13, color: '#0f172a' }}>
                        ${item.monthlyCost.toFixed(2)}/mes
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ fontSize: 12.5, color: '#64748b', textAlign: 'center', margin: '14px 0' }}>
                  No hay ítems específicos cotizados. El presupuesto actual se basa en la estimación de la propuesta activa.
                </p>
              )}

              {/* Savings Tip */}
              <div style={{ marginTop: 16, background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: 12, display: 'flex', gap: 10 }}>
                <TrendingUp size={18} color="#2563eb" style={{ flexShrink: 0, marginTop: 2 }} />
                <div style={{ fontSize: 12, color: '#1e40af' }}>
                  <strong>Consejo AWS Savings Plans:</strong> Al comprometer instancias a 1 o 3 años (Compute Savings Plans), puedes ahorrar hasta un <strong>66%</strong> comparado con precios On-Demand.
                </div>
              </div>
            </div>

            <div className="aws-modal-footer">
              <button
                className="aws-btn-action"
                onClick={() => {
                  setActiveModal(null);
                  navigate('/modules/aws/costs');
                }}
              >
                <span>Ir a la Calculadora Completa</span>
                <ArrowRight size={13} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 2: Servicios Activos */}
      {activeModal === 'services' && (
        <div className="aws-modal-overlay" onClick={() => setActiveModal(null)}>
          <div className="aws-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="aws-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Server size={20} color="#2563eb" />
                <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: '#0f172a' }}>
                  Servicios en la Solución Cloud ({deployedServices.length})
                </h3>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={18} />
              </button>
            </div>

            <div className="aws-modal-body">
              {hasServices ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 320, overflowY: 'auto' }}>
                  {deployedServices.map((svcCode) => {
                    const svcData = serviceCatalog.find(
                      (s) =>
                        s.codeName.toLowerCase() === svcCode.toLowerCase() ||
                        s.name.toLowerCase().includes(svcCode.toLowerCase())
                    );
                    return (
                      <div
                        key={svcCode}
                        style={{
                          padding: '12px 14px',
                          border: '1px solid #e2e8f0',
                          borderRadius: 10,
                          background: '#ffffff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                            <strong style={{ fontSize: 13.5, color: '#1e293b' }}>
                              AWS {svcCode}
                            </strong>
                            {svcData && (
                              <span style={{ fontSize: 10.5, padding: '1px 6px', borderRadius: 4, background: '#f1f5f9', color: '#475569', fontWeight: 600 }}>
                                {svcData.category}
                              </span>
                            )}
                          </div>
                          <p style={{ margin: 0, fontSize: 12, color: '#64748b' }}>
                            {svcData?.description || 'Servicio aprovisionado en la arquitectura'}
                          </p>
                        </div>
                        <CheckCircle size={16} color="#16a34a" />
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '20px 0' }}>
                  <Server size={32} color="#94a3b8" style={{ margin: '0 auto 8px' }} />
                  <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>
                    No hay servicios configurados aún. Visita el Catálogo de Servicios para comenzar.
                  </p>
                </div>
              )}
            </div>

            <div className="aws-modal-footer">
              <button
                className="aws-btn-action"
                onClick={() => {
                  setActiveModal(null);
                  navigate('/modules/aws/services');
                }}
              >
                <span>Explorar Catálogo de Servicios</span>
                <ArrowRight size={13} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 3: SLA y Disponibilidad */}
      {activeModal === 'sla' && (
        <div className="aws-modal-overlay" onClick={() => setActiveModal(null)}>
          <div className="aws-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="aws-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Layers size={20} color="#059669" />
                <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: '#0f172a' }}>
                  Matriz de Disponibilidad & SLA ({slaPercent}%)
                </h3>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={18} />
              </button>
            </div>

            <div className="aws-modal-body">
              <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: 10, padding: 14, marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <Activity size={16} color="#059669" />
                  <strong style={{ fontSize: 13, color: '#065f46' }}>Nivel de Resiliencia Actual</strong>
                </div>
                <p style={{ margin: 0, fontSize: 12, color: '#047857' }}>
                  {slaPercent >= 99.99
                    ? 'Arquitectura Multi-AZ de Alta Resiliencia con conmutación por error automática (tolerancia máxima de 4.38 minutos de inactividad al mes).'
                    : slaPercent >= 99.9
                    ? 'Disponibilidad estándar con soporte de redundancia en al menos 2 zonas de disponibilidad (AZ).'
                    : 'Sin propuesta activa. Te sugerimos configurar balanceadores de carga ALB y bases de datos Multi-AZ.'}
                </p>
              </div>

              <h4 style={{ fontSize: 13, fontWeight: 700, color: '#334155', margin: '0 0 10px' }}>
                Estándares de SLA en AWS:
              </h4>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: 10, borderRadius: 8, background: '#f8fafc', border: '1px solid #e2e8f0', fontSize: 12 }}>
                  <span>99.99% (Four Nines)</span>
                  <span style={{ fontWeight: 700, color: '#059669' }}>Máx 52.6 min inactividad/año</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: 10, borderRadius: 8, background: '#f8fafc', border: '1px solid #e2e8f0', fontSize: 12 }}>
                  <span>99.95% (High Availability)</span>
                  <span style={{ fontWeight: 700, color: '#2563eb' }}>Máx 4.38 horas inactividad/año</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: 10, borderRadius: 8, background: '#f8fafc', border: '1px solid #e2e8f0', fontSize: 12 }}>
                  <span>99.9% (Standard Multi-AZ)</span>
                  <span style={{ fontWeight: 700, color: '#64748b' }}>Máx 8.76 horas inactividad/año</span>
                </div>
              </div>
            </div>

            <div className="aws-modal-footer">
              <button
                className="aws-btn-action"
                onClick={() => {
                  setActiveModal(null);
                  navigate('/modules/aws/infrastructure');
                }}
              >
                <span>Ver Zonas de Disponibilidad (AZs)</span>
                <ArrowRight size={13} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 4: Postura de Seguridad Interactiva */}
      {activeModal === 'security' && (
        <div className="aws-modal-overlay" onClick={() => setActiveModal(null)}>
          <div className="aws-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="aws-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <ShieldCheck size={20} color="#16a34a" />
                <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: '#0f172a' }}>
                  Postura de Seguridad & IAM ({securityScore}/100)
                </h3>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={18} />
              </button>
            </div>

            <div className="aws-modal-body">
              <p style={{ fontSize: 12.5, color: '#64748b', margin: '0 0 14px' }}>
                Activa o desactiva las políticas de seguridad para evaluar tu puntaje en tiempo real según el <em>AWS Well-Architected Framework</em>:
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[
                  { key: 'rootBlocked' as const, title: 'Bloqueo de Cuenta Root', desc: 'No usar credenciales root para tareas diarias', pts: '+20 pts' },
                  { key: 'mfaEnforced' as const, title: 'MFA Obligatorio en IAM', desc: 'Autenticación multifactor para todos los administradores', pts: '+20 pts' },
                  { key: 'ec2Roles' as const, title: 'Roles IAM para Cómputo', desc: 'Evita hardcodear API keys en instancias o lambdas', pts: '+20 pts' },
                  { key: 'tls13' as const, title: 'Cifrado en Tránsito TLS 1.3', desc: 'HTTPS obligatorio en CloudFront y balanceadores ALB', pts: '+15 pts' },
                  { key: 's3EncryptionAndVersioning' as const, title: 'Cifrado KMS en S3', desc: 'Cifrado en reposo con SSE-KMS y versionado de buckets', pts: '+15 pts' },
                  { key: 'complianceAudits' as const, title: 'AWS CloudTrail Activo', desc: 'Registro y auditoría continua de llamadas API', pts: '+10 pts' },
                ].map((item) => {
                  const isActive = securityControls[item.key];
                  return (
                    <div
                      key={item.key}
                      onClick={() => toggleSecurityControl(item.key)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 12px',
                        borderRadius: 8,
                        border: `1px solid ${isActive ? '#86efac' : '#e2e8f0'}`,
                        background: isActive ? '#f0fdf4' : '#ffffff',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div
                          style={{
                            width: 20,
                            height: 20,
                            borderRadius: 6,
                            border: `1px solid ${isActive ? '#16a34a' : '#cbd5e1'}`,
                            background: isActive ? '#16a34a' : '#ffffff',
                            color: '#ffffff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          {isActive && <Check size={13} strokeWidth={3} />}
                        </div>
                        <div>
                          <strong style={{ fontSize: 13, color: '#1e293b' }}>{item.title}</strong>
                          <span style={{ fontSize: 11, color: '#64748b', display: 'block' }}>{item.desc}</span>
                        </div>
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 700, color: isActive ? '#16a34a' : '#94a3b8' }}>
                        {item.pts}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="aws-modal-footer">
              <button
                className="aws-btn-action"
                onClick={() => {
                  setActiveModal(null);
                  navigate('/modules/aws/security');
                }}
              >
                <span>Ir al Módulo de Seguridad Completo</span>
                <ArrowRight size={13} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
