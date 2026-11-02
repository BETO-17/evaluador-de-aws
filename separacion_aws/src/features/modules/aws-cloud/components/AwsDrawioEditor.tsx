import { useEffect, useRef, useState } from 'react';
import { Download, RefreshCw, Save, Trash2 } from 'lucide-react';
import { DrawIoEmbed, type DrawIoEmbedRef } from 'react-drawio';
import { useAws } from '../context/AwsContext';
import { awsApi } from '../services/awsApi';

const BLANK_DRAWIO_XML = '<mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/></root></mxGraphModel>';

export default function AwsDrawioEditor() {
  const { activeProposal, selectedRegion } = useAws();
  const rea = activeProposal?.reaEvaluation;
  const drawioRef = useRef<DrawIoEmbedRef | null>(null);
  const [xmlContent, setXmlContent] = useState('');
  const [status, setStatus] = useState('Selecciona una propuesta para cargar su diagrama.');

  const loadDiagram = () => {
    if (!activeProposal) return;
    void awsApi.getDiagram(activeProposal.id).then((diagram) => {
      setXmlContent(diagram.drawio_xml);
      drawioRef.current?.load({ xml: diagram.drawio_xml });
      setStatus('Diagrama cargado desde el backend.');
    }).catch(() => setStatus('No se pudo cargar el diagrama de la propuesta.'));
  };

  useEffect(loadDiagram, [activeProposal?.id]);

  const saveDiagram = (xml: string) => {
    setXmlContent(xml);
    if (!activeProposal) return;
    void awsApi.saveDiagram(activeProposal.id, { drawioXml: xml, regionSnapshot: selectedRegion }).then(() => setStatus(`Guardado en backend · ${new Date().toLocaleTimeString()}`)).catch(() => setStatus('No se pudo guardar el diagrama.'));
  };

  const clearCanvas = () => {
    drawioRef.current?.load({ xml: BLANK_DRAWIO_XML });
    saveDiagram(BLANK_DRAWIO_XML);
  };

  const download = () => {
    if (!xmlContent) return;
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([xmlContent], { type: 'application/xml;charset=utf-8' }));
    link.download = `${(activeProposal?.solutionName || 'arquitectura-aws').replace(/[^a-z0-9-_]+/gi, '-')}.drawio`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  return <div style={{ display: 'grid', gap: 14 }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
      <span style={{ color: '#64748b', fontSize: 13 }}>
        {rea ? `REA · ${rea.architecture_pattern} · ${activeProposal?.appliedScenario || 'Recommended-Production'} · ${status}` : status}
      </span>
      <div style={{ display: 'flex', gap: 8 }}>
        <button type="button" onClick={loadDiagram} disabled={!activeProposal}><RefreshCw size={14} /> Cargar del backend</button>
        <button type="button" onClick={clearCanvas} disabled={!activeProposal}><Trash2 size={14} /> Limpiar</button>
        <button type="button" onClick={download} disabled={!xmlContent}><Download size={14} /> Exportar .drawio</button>
      </div>
    </div>
    <div style={{ height: 700, background: '#fff', border: '1px solid #cbd5e1', borderRadius: 14, overflow: 'hidden' }}>
      {activeProposal ? <DrawIoEmbed ref={drawioRef} xml={xmlContent} autosave urlParameters={{ ui: 'kennedy', spin: true, libraries: true, saveAndExit: false, noExitBtn: true, grid: true, lang: 'es' }} onAutoSave={(data) => data.xml && saveDiagram(data.xml)} onSave={(data) => data.xml && saveDiagram(data.xml)} /> : <div style={{ height: '100%', display: 'grid', placeItems: 'center', color: '#64748b' }}><div style={{ textAlign: 'center' }}><Save size={30} /><p>No hay propuesta activa. Crea o selecciona una propuesta en Planificación.</p></div></div>}
    </div>
  </div>;
}
