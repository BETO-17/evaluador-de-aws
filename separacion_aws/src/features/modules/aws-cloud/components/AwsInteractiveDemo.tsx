/**
 * Laboratorio visual de ejemplo para la landing de Cloud Diagnostix.
 * Simula React Flow y Draw.io con estado local, sin tocar propuestas reales.
 */

import { useState } from 'react';
import { CheckCircle2, GitBranch, MousePointer2, PenTool, Server, SquareStack } from 'lucide-react';

type DemoMode = 'reactflow' | 'drawio';
type DemoNode = 'frontend' | 'api' | 'data' | 'storage';

const REACT_FLOW_NODES: Record<DemoNode, { title: string; subtitle: string; color: string }> = {
  frontend: { title: 'Web App', subtitle: 'React + Vite', color: '#60a5fa' },
  api: { title: 'API Gateway', subtitle: 'FastAPI', color: '#34d399' },
  data: { title: 'RDS', subtitle: 'PostgreSQL', color: '#c084fc' },
  storage: { title: 'S3', subtitle: 'Assets', color: '#fbbf24' },
};

const DRAWIO_NODES: Record<DemoNode, { title: string; subtitle: string; color: string }> = {
  frontend: { title: 'CloudFront', subtitle: 'Edge delivery', color: '#60a5fa' },
  api: { title: 'ALB', subtitle: 'Load balancer', color: '#f97316' },
  data: { title: 'EC2', subtitle: 'Compute layer', color: '#34d399' },
  storage: { title: 'RDS + S3', subtitle: 'Data layer', color: '#c084fc' },
};

interface AwsInteractiveDemoProps {
  isDark: boolean;
}

export default function AwsInteractiveDemo({ isDark }: AwsInteractiveDemoProps) {
  const [mode, setMode] = useState<DemoMode>('reactflow');
  const [activeNode, setActiveNode] = useState<DemoNode>('api');
  const nodes = mode === 'reactflow' ? REACT_FLOW_NODES : DRAWIO_NODES;
  const active = nodes[activeNode];
  const panel = isDark ? '#111827' : '#ffffff';
  const panelMuted = isDark ? '#0f172a' : '#f8fafc';
  const text = isDark ? '#f8fafc' : '#0f172a';
  const muted = isDark ? '#94a3b8' : '#64748b';

  return (
    <div
      style={{
        position: 'relative',
        background: isDark ? 'rgba(15, 23, 42, .88)' : '#ffffff',
        border: isDark ? '1px solid #263b5c' : '1px solid #dbe5f1',
        borderRadius: 18,
        padding: 20,
        boxShadow: isDark ? '0 24px 48px rgba(0, 0, 0, .35)' : '0 18px 42px rgba(15, 23, 42, .12)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 15 }}>
        <div>
          <span style={{ color: '#93c5fd', fontSize: 10, fontWeight: 900, letterSpacing: 1.2 }}>LABORATORIO DE EJEMPLO</span>
          <h2 style={{ margin: '6px 0 3px', color: '#ffffff', fontSize: 18, lineHeight: 1.2 }}>Explora una arquitectura interactiva</h2>
          <p style={{ margin: 0, color: '#94a3b8', fontSize: 11.5 }}>Prueba los controles; no se guardan cambios.</p>
        </div>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: '#34d399', fontSize: 9, fontWeight: 900, whiteSpace: 'nowrap' }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#34d399', boxShadow: '0 0 0 4px rgba(52,211,153,.12)' }} /> SOLO DEMO
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7, padding: 4, marginBottom: 14, background: panelMuted, border: `1px solid ${isDark ? '#263b5c' : '#e2e8f0'}`, borderRadius: 10 }}>
        {([
          ['reactflow', GitBranch, 'React Flow'],
          ['drawio', PenTool, 'Draw.io'],
        ] as const).map(([key, Icon, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => { setMode(key); setActiveNode('api'); }}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, minHeight: 35, border: 0, borderRadius: 7, color: mode === key ? '#ffffff' : muted, background: mode === key ? (key === 'reactflow' ? '#2563eb' : '#c2410c') : 'transparent', fontSize: 11.5, fontWeight: 800, cursor: 'pointer' }}
          >
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 135px', gap: 10 }}>
        <div style={{ position: 'relative', minHeight: 205, padding: 12, background: panelMuted, border: `1px solid ${isDark ? '#263b5c' : '#e2e8f0'}`, borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 13, color: muted, fontSize: 9.5, fontWeight: 800, letterSpacing: .6 }}>
            <MousePointer2 size={12} /> {mode === 'reactflow' ? 'GRAFO DE SERVICIOS' : 'LIENZO DE ARQUITECTURA'}
          </div>
          <div style={{ display: 'grid', gap: 8 }}>
            {(Object.keys(nodes) as DemoNode[]).map((node, index) => {
              const item = nodes[node];
              const isActive = node === activeNode;
              return (
                <div key={node} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <button type="button" onClick={() => setActiveNode(node)} style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, padding: '8px 9px', border: `1px solid ${isActive ? item.color : isDark ? '#334155' : '#dbe5f1'}`, borderRadius: 8, background: isActive ? `${item.color}18` : panel, color: text, cursor: 'pointer', textAlign: 'left' }}>
                    <span style={{ width: 24, height: 24, display: 'grid', placeItems: 'center', flexShrink: 0, borderRadius: 6, color: item.color, background: `${item.color}20` }}>{mode === 'reactflow' ? <Server size={13} /> : <SquareStack size={13} />}</span>
                    <span><strong style={{ display: 'block', fontSize: 10.5 }}>{item.title}</strong><small style={{ display: 'block', marginTop: 2, color: muted, fontSize: 9 }}>{item.subtitle}</small></span>
                  </button>
                  {index < 3 && <span style={{ color: isDark ? '#475569' : '#94a3b8', fontSize: 14 }}>→</span>}
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ padding: 12, background: panel, border: `1px solid ${isDark ? '#263b5c' : '#dbe5f1'}`, borderRadius: 12 }}>
          <span style={{ color: '#60a5fa', fontSize: 9, fontWeight: 900, letterSpacing: .7 }}>NODO ACTIVO</span>
          <div style={{ width: 34, height: 34, display: 'grid', placeItems: 'center', margin: '13px 0 10px', borderRadius: 9, color: active.color, background: `${active.color}20` }}>
            {mode === 'reactflow' ? <GitBranch size={17} /> : <PenTool size={17} />}
          </div>
          <strong style={{ display: 'block', color: text, fontSize: 12 }}>{active.title}</strong>
          <span style={{ display: 'block', marginTop: 3, color: muted, fontSize: 10 }}>{active.subtitle}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 17, color: '#34d399', fontSize: 9, fontWeight: 800 }}><CheckCircle2 size={12} /> Conectado</div>
        </div>
      </div>

      <p style={{ margin: '13px 0 0', color: muted, fontSize: 10, lineHeight: 1.4, textAlign: 'center' }}>
        {mode === 'reactflow' ? 'Haz clic en un nodo para inspeccionar el flujo normal del proyecto.' : 'Selecciona un servicio para revisar su lugar en el diagrama AWS de ejemplo.'}
      </p>
    </div>
  );
}
