import { useCallback, useEffect, useState } from 'react';
import { addEdge, Background, Controls, MiniMap, ReactFlow, useEdgesState, useNodesState, type Connection, type Edge, type Node } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Plus, Save } from 'lucide-react';
import { useAws } from '../context/AwsContext';
import { awsApi } from '../services/awsApi';

function buildGraph(services: string[], region: string, name: string, catalog: ReturnType<typeof useAws>['serviceCatalog']) {
  const nodes: Node[] = [{ id: 'entry', position: { x: 0, y: 180 }, data: { label: `Internet\n${name}` }, style: { background: '#eff6ff', border: '2px solid #2563eb', borderRadius: 10, padding: 12, width: 170 } }];
  const edges: Edge[] = [];
  services.forEach((code, index) => {
    const service = catalog.find((item) => item.codeName.toLowerCase() === code.toLowerCase());
    const id = `service-${index}`;
    nodes.push({ id, position: { x: 240 + (index % 3) * 220, y: 80 + Math.floor(index / 3) * 130 }, data: { label: `${service?.shortName || code}\n${region}` }, style: { background: '#ffffff', border: '2px solid #10b981', borderRadius: 10, padding: 12, width: 180 } });
    edges.push({ id: `edge-${index}`, source: index === 0 ? 'entry' : `service-${index - 1}`, target: id, animated: true, style: { stroke: '#2563eb', strokeWidth: 2 } });
  });
  return { nodes, edges };
}

export default function AwsReactFlowView() {
  const { activeProposal, deployedServices, selectedRegion, serviceCatalog } = useAws();
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [status, setStatus] = useState('El grafo representa la propuesta cargada desde el backend.');

  const syncGraph = useCallback(() => {
    if (!activeProposal) {
      setNodes([]);
      setEdges([]);
      return;
    }
    const graph = buildGraph(deployedServices, selectedRegion, activeProposal.solutionName, serviceCatalog);
    setNodes(graph.nodes);
    setEdges(graph.edges);
  }, [activeProposal, deployedServices, selectedRegion, serviceCatalog, setEdges, setNodes]);

  useEffect(() => {
    if (!activeProposal) {
      syncGraph();
      return;
    }
    let cancelled = false;
    void awsApi.getDiagram(activeProposal.id).then((diagram) => {
      const graph = diagram.reactflow_graph;
      if (!cancelled && graph?.nodes?.length) {
        setNodes(graph.nodes as Node[]);
        setEdges((graph.edges || []) as Edge[]);
        setStatus('Arquitectura REA cargada desde el backend. Las flechas muestran sus relaciones.');
      } else if (!cancelled) {
        syncGraph();
      }
    }).catch(() => {
      if (!cancelled) {
        syncGraph();
        setStatus('No se pudo cargar el grafo REA; revisa la conexión con el backend.');
      }
    });
    return () => { cancelled = true; };
  }, [activeProposal?.id, syncGraph, setEdges, setNodes]);

  const onConnect = useCallback((connection: Connection) => setEdges((current) => addEdge({ ...connection, animated: true }, current)), [setEdges]);

  const addCustomNode = () => setNodes((current) => [...current, { id: `custom-${Date.now()}`, position: { x: 400, y: 420 }, data: { label: 'Nodo personalizado' }, style: { background: '#fff7ed', border: '2px solid #f97316', borderRadius: 10, padding: 12 } }]);

  const saveGraph = async () => {
    if (!activeProposal) return;
    try {
      await awsApi.saveDiagram(activeProposal.id, { regionSnapshot: selectedRegion, reactflowGraph: { nodes, edges } });
      setStatus('Grafo de arquitectura REA guardado en el backend.');
    } catch {
      setStatus('No se pudo guardar el grafo en el backend.');
    }
  };

  return <div style={{ display: 'grid', gap: 12 }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}><span style={{ color: '#64748b', fontSize: 13 }}>{status}</span><div style={{ display: 'flex', gap: 8 }}><button type="button" onClick={addCustomNode} disabled={!activeProposal}><Plus size={14} /> Añadir nodo</button><button type="button" onClick={saveGraph} disabled={!activeProposal}><Save size={14} /> Guardar grafo</button></div></div>
    <div style={{ height: 620, border: '1px solid #cbd5e1', borderRadius: 14, background: '#f8fafc' }}>{activeProposal ? <ReactFlow nodes={nodes} edges={edges} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onConnect={onConnect} fitView><Background /><Controls /><MiniMap /></ReactFlow> : <div style={{ height: '100%', display: 'grid', placeItems: 'center', color: '#64748b' }}>No hay una propuesta activa cargada desde el backend.</div>}</div>
  </div>;
}
