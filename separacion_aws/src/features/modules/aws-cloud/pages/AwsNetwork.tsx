import { useState, useEffect } from 'react';
import { GitBranch, PenTool } from 'lucide-react';
import AwsReactFlowView from '../components/AwsReactFlowView';
import AwsDrawioEditor from '../components/AwsDrawioEditor';
import { useAws } from '../context/AwsContext';
import '../aws.css';

type NetworkTab = 'reactflow' | 'drawio';

export default function AwsNetwork() {
  const { activeProposal } = useAws();
  const rea = activeProposal?.reaEvaluation;
  const activeScenario = rea?.scenarios?.find((item) => item.scenario_type === activeProposal?.appliedScenario);
  const [activeTab, setActiveTab] = useState<NetworkTab>(() => {
    try {
      const saved = localStorage.getItem('aws:networkTab');
      if (saved === 'drawio' || saved === 'reactflow') {
        return saved;
      }
    } catch {
      // ignore
    }
    return 'reactflow';
  });

  useEffect(() => {
    try {
      localStorage.setItem('aws:networkTab', activeTab);
    } catch {
      // ignore
    }
  }, [activeTab]);

  return (
    <div className="aws-container">
      {/* Encabezado limpio del módulo Arquitectura de Red */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          marginBottom: 20,
        }}
      >
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#0f172a' }}>
            Arquitectura de Red — Cloud Diagnostix
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: 13.5, color: '#64748b' }}>
            Visualiza cómo está estructurado el proyecto normalmente con <strong>React Flow</strong> o diseña tu arquitectura cloud en <strong>AWS con Draw.io</strong>.
          </p>
        </div>

        {/* Selector de vistas: React Flow vs Draw.io */}
        <div
          style={{
            display: 'inline-flex',
            background: '#f1f5f9',
            padding: 4,
            borderRadius: 12,
            border: '1px solid #e2e8f0',
            gap: 4,
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab('reactflow')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '9px 16px',
              borderRadius: 9,
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              border: 'none',
              background: activeTab === 'reactflow' ? '#2563eb' : 'transparent',
              color: activeTab === 'reactflow' ? '#ffffff' : '#475569',
              boxShadow: activeTab === 'reactflow' ? '0 2px 6px rgba(37, 99, 235, 0.25)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            <GitBranch size={16} />
            Vista del Proyecto (React Flow)
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('drawio')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '9px 16px',
              borderRadius: 9,
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              border: 'none',
              background: activeTab === 'drawio' ? '#2563eb' : 'transparent',
              color: activeTab === 'drawio' ? '#ffffff' : '#475569',
              boxShadow: activeTab === 'drawio' ? '0 2px 6px rgba(37, 99, 235, 0.25)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            <PenTool size={16} />
            Dibujar Arquitectura AWS (Draw.io)
          </button>
        </div>
      </div>

      {/* Contenido de la pestaña activa */}
      <section style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 14, padding: '14px 18px', marginBottom: 18, color: '#0f172a' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <strong style={{ fontSize: 15 }}>Arquitectura evaluada por REA</strong>
          <span style={{ fontSize: 12, fontWeight: 700, color: rea?.ai_generated ? '#047857' : '#b45309' }}>
            {rea?.ai_generated ? `IA real: ${rea.ai_provider || 'proveedor configurado'}` : 'Evaluación REA disponible'}
          </span>
        </div>
        {rea ? (
          <>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
              <span style={{ padding: '5px 9px', borderRadius: 999, background: '#dbeafe', fontSize: 12 }}><strong>Patrón:</strong> {rea.architecture_pattern}</span>
              <span style={{ padding: '5px 9px', borderRadius: 999, background: '#dbeafe', fontSize: 12 }}><strong>Estrategia:</strong> {rea.migration_strategy}</span>
              <span style={{ padding: '5px 9px', borderRadius: 999, background: '#dbeafe', fontSize: 12 }}><strong>Escenario:</strong> {activeScenario?.scenario_type || activeProposal?.appliedScenario || 'No aplicado'}</span>
            </div>
            <p style={{ margin: '9px 0 0', fontSize: 12.5, color: '#475569' }}>
              Las flechas muestran las relaciones recomendadas por REA: entrada y seguridad → aplicación → datos/eventos → monitoreo. Draw.io carga el mismo resultado y permite editarlo.
            </p>
          </>
        ) : (
          <p style={{ margin: '8px 0 0', fontSize: 13, color: '#475569' }}>
            Esta propuesta todavía no tiene una evaluación REA. Ejecuta el analizador sobre un ZIP, repositorio GitHub o documento para construir la arquitectura con evidencia real.
          </p>
        )}
      </section>

      {activeTab === 'reactflow' ? <AwsReactFlowView /> : <AwsDrawioEditor />}
    </div>
  );
}
