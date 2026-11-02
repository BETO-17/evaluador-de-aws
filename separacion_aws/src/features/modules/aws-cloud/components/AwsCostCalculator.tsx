import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Trash2,
  PieChart,
  Download,
  Sparkles,
  RefreshCw,
  Info,
  DollarSign,
  TrendingUp,
  Globe,
  Layers,
} from 'lucide-react';
import { useAws } from '../context/AwsContext';
import type { AwsService, PricingUnit } from '../types/awsTypes';
import CostCard from './CostCard';
import StatusBadge from './StatusBadge';
import {
  Server,
  Database,
  HardDrive,
  Cpu,
  Shield,
  Activity,
} from 'lucide-react';

export default function AwsCostCalculator() {
  const navigate = useNavigate();
  const {
    services,
    costItems,
    addCostItem,
    deleteCostItem,
    clearCostItems,
    totalMonthlyCost,
    totalAnnualCost,
    activeProposal,
    syncCostsFromProposal,
    addService,
    serviceCatalog,
  } = useAws();

  // Filter catalog so the selector lists ONLY services in the current solution
  const solutionServices = serviceCatalog.filter((s) =>
    services.some(
      (code) =>
        code.toLowerCase() === s.codeName.toLowerCase() ||
        code.toLowerCase() === s.shortName.toLowerCase()
    )
  );

  const [selectedServiceId, setSelectedServiceId] = useState<string>(() => {
    return solutionServices[0]?.id || serviceCatalog[0]?.id || '';
  });
  const [quantity, setQuantity] = useState(2);
  const [hours, setHours] = useState(730);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Sync selected service if current selection is no longer in solution
  useEffect(() => {
    if (solutionServices.length > 0) {
      if (!solutionServices.some((s) => s.id === selectedServiceId)) {
        setSelectedServiceId(solutionServices[0].id);
      }
    }
  }, [solutionServices, selectedServiceId]);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const selectedService: AwsService | undefined =
    solutionServices.find((s) => s.id === selectedServiceId) || solutionServices[0];

  const getQuantityLabel = (unit: PricingUnit) => {
    switch (unit) {
      case 'hour':
        return 'Instancias';
      case 'gb-month':
        return 'GB almacenados';
      case 'gb-transfer':
        return 'GB transferidos';
      case 'million-requests':
        return 'Millones de solicitudes';
      case 'hosted-zone-month':
        return 'Zonas alojadas';
      case 'metric-month':
        return 'Métricas';
      case 'free':
      default:
        return 'Cantidad';
    }
  };

  const calculateCost = (service: AwsService, qty: number, hrs: number) => {
    const { unit, price } = service.pricing;
    if (unit === 'free') {
      return {
        monthly: 0,
        annual: 0,
        formulaText: 'Servicio gratuito ($0.00)',
      };
    }
    if (unit === 'hour') {
      const monthly = +(price * qty * hrs).toFixed(2);
      const annual = +(monthly * 12).toFixed(2);
      const labelText = qty === 1 ? 'instancia' : 'instancias';
      return {
        monthly,
        annual,
        formulaText: `$${price.toFixed(4)} × ${qty} ${labelText} × ${hrs} h`,
      };
    }
    const monthly = +(price * qty).toFixed(2);
    const annual = +(monthly * 12).toFixed(2);
    const qtyLabel = getQuantityLabel(unit).toLowerCase();
    return {
      monthly,
      annual,
      formulaText: `$${price.toFixed(4)} × ${qty} ${qtyLabel}`,
    };
  };

  const currentCost = selectedService
    ? calculateCost(selectedService, quantity, hours)
    : { monthly: 0, annual: 0, formulaText: '' };

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedService) return;

    const { monthly, annual, formulaText } = calculateCost(selectedService, quantity, hours);
    const qtyLabel = getQuantityLabel(selectedService.pricing.unit).toLowerCase();

    addCostItem({
      serviceId: selectedService.id,
      serviceName: selectedService.name,
      category: selectedService.category,
      instanceTypeOrTier: `${quantity} ${qtyLabel} (${selectedService.pricing.unitLabel})`,
      quantity,
      hoursPerMonth: selectedService.pricing.unit === 'hour' ? hours : 730,
      unit: selectedService.pricing.unit,
      unitPrice: selectedService.pricing.price,
      formulaText,
      costPerHour: selectedService.pricing.unit === 'hour' ? selectedService.pricing.price : 0,
      monthlyCost: monthly,
      annualCost: annual,
    });

    addService(selectedService.codeName);
    showToast(`"${selectedService.shortName}" agregado a la cotización.`);
  };

  const handleDeleteItem = (id: string) => {
    deleteCostItem(id);
    showToast('Ítem eliminado de la cotización');
  };

  // Group by category for visual distribution
  const categoryTotals: Record<string, number> = {};
  costItems.forEach((item) => {
    categoryTotals[item.category] = (categoryTotals[item.category] || 0) + item.monthlyCost;
  });

  const categoryColors: Record<string, string> = {
    'Cómputo': '#2563eb',
    'Base de Datos': '#06b6d4',
    'Almacenamiento': '#3b82f6',
    'Redes y CDN': '#0284c7',
    'Serverless': '#8b5cf6',
    'Seguridad e Identidad': '#6366f1',
    'Monitoreo y Gestión': '#64748b',
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Cómputo':
        return Server;
      case 'Base de Datos':
        return Database;
      case 'Almacenamiento':
        return HardDrive;
      case 'Redes y CDN':
        return Globe;
      case 'Serverless':
        return Cpu;
      case 'Seguridad e Identidad':
        return Shield;
      case 'Monitoreo y Gestión':
      default:
        return Activity;
    }
  };

  const hasItems = costItems.length > 0;

  const proposalRegionCode = activeProposal?.region && activeProposal.region !== 'Sin definir' && activeProposal.region !== 'Sin región'
    ? (activeProposal.region.split(' ')[0] || activeProposal.region)
    : 'Sin definir';

  const proposalRegionLocation = activeProposal?.region && activeProposal.region !== 'Sin definir' && activeProposal.region !== 'Sin región'
    ? (activeProposal.region.includes('(') ? activeProposal.region.split('(')[1].replace(')', '') : 'Región AWS')
    : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {toastMsg && (
        <div
          style={{
            position: 'fixed',
            top: 20,
            right: 20,
            background: '#0f172a',
            border: '1px solid #f59e0b',
            color: '#fef08a',
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
          <Sparkles size={16} color="#f59e0b" />
          {toastMsg}
        </div>
      )}

      {/* Notice Banner: Referencial Pricing */}
      <div
        style={{
          background: '#eff6ff',
          border: '1px solid #bfdbfe',
          borderRadius: 12,
          padding: '12px 18px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: '#1e40af' }}>
          <Info size={17} color="#2563eb" />
          <span>
            Tarifas referenciales de la región <strong>us-east-1</strong>. Precios referenciales, verificar en{' '}
            <a
              href="https://calculator.aws"
              target="_blank"
              rel="noreferrer"
              style={{ color: '#2563eb', fontWeight: 700, textDecoration: 'underline' }}
            >
              calculator.aws
            </a>
          </span>
        </div>
        <span
          style={{
            fontSize: 11.5,
            fontWeight: 700,
            color: '#1d4ed8',
            background: '#dbeafe',
            padding: '3px 10px',
            borderRadius: 20,
          }}
        >
          AWS Pricing Model v2
        </span>
      </div>

      {/* Metrics Summary Cards */}
      <div className="aws-responsive-grid-4">
        <CostCard
          title="Costo Mensual Estimado"
          value={`$${totalMonthlyCost.toFixed(2)}`}
          subtitle={
            hasItems ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: '#F59E0B' }} />
                Facturación activa proyectada
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <StatusBadge variant="neutral" status="Sin definir" size="sm" />
              </div>
            )
          }
          icon={DollarSign}
          iconColor="#F59E0B"
          iconBg="#FEF3C7"
        />

        <CostCard
          title="Costo Anual Proyectado"
          value={`$${totalAnnualCost.toFixed(2)}`}
          subtitle={hasItems ? '12 meses de operación continua' : 'Sin definir'}
          icon={TrendingUp}
          iconColor="#16A34A"
          iconBg="#DCFCE7"
        />

        <CostCard
          title="Total de Ítems en Solución"
          value={hasItems ? `${costItems.length} ${costItems.length === 1 ? 'servicio' : 'ítems'}` : 'Sin definir'}
          subtitle={hasItems ? 'Configuración bajo demanda' : <StatusBadge variant="neutral" status="Sin definir" size="sm" />}
          icon={Layers}
          iconColor="#2563EB"
          iconBg="#EFF6FF"
        />

        <CostCard
          title="Región de Cotización"
          value={proposalRegionCode}
          subtitle={
            proposalRegionLocation ? (
              proposalRegionLocation
            ) : (
              <StatusBadge variant="neutral" status="Sin definir" size="sm" />
            )
          }
          icon={Globe}
          iconColor="#2563EB"
          iconBg="#F1F5F9"
        />
      </div>

      {/* Sync Banner with active proposal if available */}
      {activeProposal && activeProposal.selectedServices.length > 0 && (
        <div
          style={{
            background: '#eff6ff',
            border: '1px solid #bfdbfe',
            borderRadius: 12,
            padding: '12px 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#1e40af' }}>
            <Info size={16} color="#2563eb" />
            <span>
              Propuesta activa: <strong>{activeProposal.solutionName}</strong> ({activeProposal.selectedServices.join(', ')}).
            </span>
          </div>
          <button
            onClick={() => {
              syncCostsFromProposal(activeProposal);
              showToast('Costos sincronizados con los servicios de la propuesta activa');
            }}
            style={{
              background: '#2563eb',
              color: '#ffffff',
              border: 'none',
              borderRadius: 6,
              padding: '6px 12px',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <RefreshCw size={13} /> Sincronizar Cotización con Propuesta
          </button>
        </div>
      )}

      {/* Add New Item Form + Distribution Chart */}
      <div className="aws-planning-grid">
        {/* Form */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 14, padding: 22 }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Plus size={18} color="#2563eb" />
            <span>Agregar Servicio a la Estimación</span>
          </h3>

          {solutionServices.length === 0 ? (
            <div
              style={{
                padding: '32px 16px',
                textAlign: 'center',
                background: '#f8fafc',
                borderRadius: 10,
                border: '1px dashed #cbd5e1',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: '50%',
                  background: '#e0f2fe',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#0284c7',
                }}
              >
                <Layers size={22} />
              </div>
              <div>
                <p style={{ margin: '0 0 4px', fontSize: 14, fontWeight: 700, color: '#1e293b' }}>
                  No hay servicios en tu solución
                </p>
                <p style={{ margin: 0, fontSize: 12.5, color: '#64748b' }}>
                  Añade servicios a tu arquitectura desde el Catálogo para cotizarlos aquí.
                </p>
              </div>
              <button
                type="button"
                onClick={() => navigate('/modules/aws/services')}
                style={{
                  background: '#2563eb',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: 8,
                  padding: '8px 16px',
                  fontSize: 12.5,
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  marginTop: 4,
                }}
              >
                <Plus size={14} /> Agregar servicios
              </button>
            </div>
          ) : (
            <form onSubmit={handleAddItem} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#334155', marginBottom: 5 }}>
                  Seleccionar Servicio AWS (Servicios en Solución)
                </label>
                <select
                  value={selectedServiceId}
                  onChange={(e) => setSelectedServiceId(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13 }}
                >
                  {solutionServices.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.pricing.unitLabel})
                    </option>
                  ))}
                </select>
                {selectedService?.pricing.note && (
                  <span style={{ display: 'block', fontSize: 11, color: '#64748b', marginTop: 4 }}>
                    Nota: {selectedService.pricing.note}
                  </span>
                )}
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: selectedService?.pricing.unit === 'hour' ? '1fr 1fr' : '1fr',
                  gap: 12,
                }}
              >
                <div>
                  <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#334155', marginBottom: 5 }}>
                    {selectedService ? getQuantityLabel(selectedService.pricing.unit) : 'Cantidad'}
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={100000}
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13 }}
                  />
                </div>

                {selectedService?.pricing.unit === 'hour' && (
                  <div>
                    <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#334155', marginBottom: 5 }}>
                      Horas de uso al mes (730 = 24/7)
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={730}
                      value={hours}
                      onChange={(e) => setHours(Math.max(1, Math.min(730, Number(e.target.value))))}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13 }}
                    />
                  </div>
                )}
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginTop: 6,
                  paddingTop: 12,
                  borderTop: '1px solid #f1f5f9',
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <div style={{ fontSize: 12.5, color: '#64748b' }}>
                    Costo calculado:{' '}
                    <strong style={{ color: '#2563eb', fontSize: 15 }}>
                      ${currentCost.monthly.toFixed(2)}/mes
                    </strong>
                    <span style={{ fontSize: 11, color: '#64748b', marginLeft: 6 }}>
                      (${currentCost.annual.toFixed(2)}/año)
                    </span>
                  </div>
                  <div style={{ fontSize: 11, color: '#94a3b8', fontFamily: 'monospace' }}>
                    {currentCost.formulaText}
                  </div>
                </div>

                <button
                  type="submit"
                  style={{
                    background: '#2563eb',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: 8,
                    padding: '9px 18px',
                    fontWeight: 700,
                    fontSize: 13,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <Plus size={15} /> Añadir Ítem
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Visual Category Distribution Graph */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 14, padding: 22, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <h3 style={{ margin: '0 0 14px', fontSize: 16, fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 8 }}>
              <PieChart size={18} color="#f59e0b" />
              <span>Distribución de Costos por Categoría</span>
            </h3>

            {hasItems ? (
              <>
                {/* Segmented Bar Graphic */}
                <div style={{ height: 18, borderRadius: 9, display: 'flex', overflow: 'hidden', background: '#e2e8f0', marginBottom: 16 }}>
                  {Object.entries(categoryTotals).map(([cat, amount]) => {
                    const percent = totalMonthlyCost > 0 ? (amount / totalMonthlyCost) * 100 : 0;
                    return (
                      <div
                        key={cat}
                        style={{
                          width: `${percent}%`,
                          background: categoryColors[cat] || '#2563eb',
                          transition: 'width 0.3s ease',
                        }}
                        title={`${cat}: $${amount.toFixed(2)} (${percent.toFixed(1)}%)`}
                      />
                    );
                  })}
                </div>

                {/* Legend Breakdown */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                  {Object.entries(categoryTotals).map(([cat, amount]) => {
                    const percent = totalMonthlyCost > 0 ? (amount / totalMonthlyCost) * 100 : 0;
                    return (
                      <div key={cat} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12.5 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                          <span style={{ width: 10, height: 10, borderRadius: '50%', background: categoryColors[cat] || '#2563eb' }} />
                          <span style={{ color: '#334155', fontWeight: 600 }}>{cat}</span>
                        </div>
                        <span style={{ fontWeight: 700, color: '#1e293b' }}>
                          ${amount.toFixed(2)} <span style={{ color: '#64748b', fontSize: 11 }}>({percent.toFixed(1)}%)</span>
                        </span>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <div
                style={{
                  padding: '36px 16px',
                  textAlign: 'center',
                  background: '#f8fafc',
                  borderRadius: 10,
                  border: '1px dashed #cbd5e1',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 10,
                }}
              >
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    background: '#f1f5f9',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#94a3b8',
                  }}
                >
                  <PieChart size={20} />
                </div>
                <div>
                  <p style={{ margin: '0 0 4px', fontSize: 13.5, fontWeight: 700, color: '#1e293b' }}>
                    Sin datos de distribución
                  </p>
                  <p style={{ margin: 0, fontSize: 12, color: '#64748b' }}>
                    Añade servicios a tu cotización para generar la distribución porcentual de costos.
                  </p>
                </div>
              </div>
            )}
          </div>

          <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 11.5, color: '#059669', fontWeight: 600 }}>Estimador en tiempo real</span>
            <div style={{ display: 'flex', gap: 8 }}>
              {hasItems && (
                <button
                  onClick={clearCostItems}
                  style={{
                    background: '#fef2f2',
                    border: '1px solid #fecaca',
                    borderRadius: 6,
                    padding: '4px 10px',
                    fontSize: 11.5,
                    fontWeight: 600,
                    color: '#dc2626',
                    cursor: 'pointer',
                  }}
                >
                  Vaciar
                </button>
              )}
              <button
                onClick={() => showToast('Reporte de costos exportado')}
                disabled={!hasItems}
                style={{
                  background: '#f8fafc',
                  border: '1px solid #cbd5e1',
                  borderRadius: 6,
                  padding: '4px 10px',
                  fontSize: 11.5,
                  fontWeight: 600,
                  color: '#334155',
                  cursor: hasItems ? 'pointer' : 'not-allowed',
                  opacity: hasItems ? 1 : 0.5,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                }}
              >
                <Download size={12} /> Exportar
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Items Breakdown Section Using CostCard */}
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 14, padding: 22 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 18 }}>
          <div>
            <h3 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 700, color: '#1e293b' }}>
              Desglose de Ítems Cotizados ({costItems.length})
            </h3>
            <span style={{ fontSize: 12, color: '#64748b' }}>Tarifas calculadas con base de 730 horas/mes (24/7)</span>
          </div>
          {hasItems && (
            <span style={{ fontSize: 12, fontWeight: 600, color: '#2563eb', background: '#eff6ff', padding: '4px 10px', borderRadius: 6 }}>
              Total mensual: ${totalMonthlyCost.toFixed(2)}
            </span>
          )}
        </div>

        {hasItems ? (
          <div className="aws-responsive-grid-3">
            {costItems.map((item) => (
              <CostCard
                key={item.id}
                title={item.serviceName}
                value={`$${item.monthlyCost.toFixed(2)}`}
                badge={
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span
                      style={{
                        background: '#f1f5f9',
                        color: '#475569',
                        padding: '2px 8px',
                        borderRadius: 6,
                        fontSize: 11,
                        fontWeight: 600,
                      }}
                    >
                      {item.category}
                    </span>
                    <button
                      onClick={() => handleDeleteItem(item.id)}
                      style={{
                        background: '#fef2f2',
                        border: '1px solid #fee2e2',
                        borderRadius: 6,
                        cursor: 'pointer',
                        color: '#dc2626',
                        padding: '5px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                      title="Eliminar ítem"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                }
                icon={getCategoryIcon(item.category)}
                iconColor={categoryColors[item.category] || '#2563EB'}
                iconBg={`${categoryColors[item.category] || '#2563EB'}15`}
                subtitle={
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 4 }}>
                    <div style={{ fontSize: 12, color: '#64748B' }}>
                      {item.instanceTypeOrTier}
                    </div>
                    <div style={{ fontSize: 11, color: '#64748B', fontFamily: 'monospace' }}>
                      {item.formulaText || `$${(item.costPerHour || 0).toFixed(4)} × ${item.quantity}`}
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#16a34a', marginTop: 2 }}>
                      Proyección anual: ${item.annualCost.toFixed(2)}/año
                    </div>
                  </div>
                }
              />
            ))}
          </div>
        ) : (
          <div
            style={{
              padding: '36px 20px',
              textAlign: 'center',
              color: '#64748b',
              background: '#f8fafc',
              borderRadius: 10,
              border: '1px dashed #cbd5e1',
            }}
          >
            <p style={{ margin: 0, fontSize: 13 }}>
              No hay ítems en la cotización actual. Agrega servicios desde el formulario superior o desde el Catálogo de Servicios.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
