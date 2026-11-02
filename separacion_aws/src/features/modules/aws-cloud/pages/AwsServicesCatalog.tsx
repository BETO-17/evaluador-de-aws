import { useState } from 'react';
import { Search, CheckCircle } from 'lucide-react';
import AwsServiceCard from '../components/AwsServiceCard';
import { useAws } from '../context/AwsContext';
import type { ServiceCategory } from '../types/awsTypes';
import '../aws.css';

const categories: ('Todas' | ServiceCategory)[] = [
  'Todas',
  'Cómputo',
  'Almacenamiento',
  'Base de Datos',
  'Redes y CDN',
  'Seguridad e Identidad',
  'Serverless',
  'Monitoreo y Gestión',
];

type StatusFilter = 'Todos' | 'En propuesta' | 'Disponibles';

export default function AwsServicesCatalog() {
  const { deployedServices, serviceCatalog } = useAws();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'Todas' | ServiceCategory>('Todas');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('Todos');

  const inArchitectureCount = serviceCatalog.filter((svc) =>
    deployedServices.some((code) => code.toLowerCase() === svc.codeName.toLowerCase())
  ).length;
  const availableCount = serviceCatalog.length - inArchitectureCount;

  const getCategoryCount = (cat: 'Todas' | ServiceCategory): number => {
    if (cat === 'Todas') return serviceCatalog.length;
    return serviceCatalog.filter((svc) => svc.category === cat).length;
  };

  const filteredServices = serviceCatalog.filter((svc) => {
    const isDeployed = deployedServices.some((code) => code.toLowerCase() === svc.codeName.toLowerCase());
    const matchesStatus =
      statusFilter === 'Todos' ||
      (statusFilter === 'En propuesta' && isDeployed) ||
      (statusFilter === 'Disponibles' && !isDeployed);
    const matchesCategory = selectedCategory === 'Todas' || svc.category === selectedCategory;
    const matchesSearch =
      svc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      svc.codeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      svc.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (svc.mainFunction && svc.mainFunction.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesStatus && matchesCategory && matchesSearch;
  });

  return (
    <div className="aws-container">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: '#1e293b', margin: '0 0 4px' }}>
            Catálogo de Servicios AWS
          </h1>
          <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>
            Explorador técnico. Añade servicios directamente a tu cotización y propuesta cloud con 1 clic.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#ffffff', padding: '8px 14px', borderRadius: 10, border: '1px solid #e2e8f0' }}>
          <CheckCircle size={15} color="#2563eb" />
          <span style={{ fontSize: 12.5, color: '#64748b' }}>En tu arquitectura:</span>
          <strong style={{ fontSize: 13, color: '#1e293b' }}>
            {inArchitectureCount} de {serviceCatalog.length} servicios
          </strong>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div
        style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: 14,
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 14,
          boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
        }}
      >
        {/* Filtro Todos · En propuesta · Disponibles con conteos */}
        <div style={{ display: 'inline-flex', background: '#f1f5f9', padding: 3, borderRadius: 10, border: '1px solid #e2e8f0', gap: 3 }}>
          {(['Todos', 'En propuesta', 'Disponibles'] as StatusFilter[]).map((tab) => {
            const count = tab === 'Todos' ? serviceCatalog.length : tab === 'En propuesta' ? inArchitectureCount : availableCount;
            const isSelected = statusFilter === tab;
            return (
              <button
                key={tab}
                type="button"
                onClick={() => setStatusFilter(tab)}
                style={{
                  padding: '6px 12px',
                  borderRadius: 7,
                  fontSize: 12,
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer',
                  background: isSelected ? '#ffffff' : 'transparent',
                  color: isSelected ? '#1e293b' : '#64748b',
                  boxShadow: isSelected ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                  transition: 'all 0.15s ease',
                }}
              >
                {tab} ({count})
              </button>
            );
          })}
        </div>

        {/* Search Input */}
        <div style={{ position: 'relative', width: 300, minWidth: 240, flex: '1 1 auto', maxWidth: 360 }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: 10, color: '#94a3b8' }} />
          <input
            type="text"
            placeholder="Buscar por nombre o función (ej. EC2, S3)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '9px 12px 9px 36px',
              borderRadius: 8,
              border: '1px solid #cbd5e1',
              fontSize: 13,
            }}
          />
        </div>

        {/* Category Filter Pills with counts */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {categories.map((cat) => {
            const isSelected = selectedCategory === cat;
            const count = getCategoryCount(cat);
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                style={{
                  padding: '6px 12px',
                  borderRadius: 20,
                  fontSize: 12,
                  fontWeight: 700,
                  border: isSelected ? '1.5px solid #2563eb' : '1px solid #cbd5e1',
                  background: isSelected ? '#eff6ff' : '#ffffff',
                  color: isSelected ? '#1d4ed8' : '#64748b',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                {cat} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Services Grid */}
      <div className="aws-responsive-grid-3">
        {filteredServices.map((svc) => (
          <AwsServiceCard key={svc.id} service={svc} />
        ))}
      </div>

      {filteredServices.length === 0 && (
        <div
          style={{
            background: '#ffffff',
            border: '1px dashed #cbd5e1',
            borderRadius: 14,
            padding: '40px 20px',
            textAlign: 'center',
            color: '#64748b',
          }}
        >
          <Search size={32} style={{ margin: '0 auto 10px', color: '#94a3b8' }} />
          <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1e293b', margin: '0 0 4px' }}>
            No se encontraron servicios
          </h3>
          <p style={{ fontSize: 13, margin: 0 }}>
            Intenta buscar con otro término o selecciona "Todas" en las categorías.
          </p>
        </div>
      )}
    </div>
  );
}
