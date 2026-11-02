import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ArrowRight, Bot, Check, DollarSign, Globe, Layers, Send, Shield, ShieldCheck, User, X, Zap } from 'lucide-react';
import { useAws } from '../context/AwsContext';
import { awsApi } from '../services/awsApi';

interface MessageAction {
  type: 'apply_region' | 'apply_architecture' | 'apply_security';
  label: string;
  payload: any;
}

interface Message {
  id: string;
  sender: 'bot' | 'user';
  text: string;
  timestamp: string;
  action?: MessageAction;
  detailsCard?: {
    title: string;
    badge: string;
    items: { label: string; value: string }[];
    pros?: string[];
  };
}

interface AwsAiRegionAdvisorProps {
  isOpen: boolean;
  onClose: () => void;
}

const quickPromptCategories: { icon: ReactNode; label: string; prompts: string[] }[] = [
  { icon: <Layers size={13} />, label: 'Arquitectura', prompts: ['Crear arquitectura e-commerce', 'Diseñar arquitectura serverless', 'Estructurar API con microservicios'] },
  { icon: <Shield size={13} />, label: 'Seguridad', prompts: ['Auditar mi postura de seguridad IAM', '¿Qué controles me faltan para llegar a 100/100?'] },
  { icon: <Globe size={13} />, label: 'Regiones', prompts: ['Recomiéndame la mejor región para Perú y LATAM', '¿Cuál es la región más económica?'] },
  { icon: <DollarSign size={13} />, label: 'Costos', prompts: ['¿Cómo optimizar mis costos mensuales?', 'Calcular arquitectura económica'] },
];

export default function AwsAiRegionAdvisor({ isOpen, onClose }: AwsAiRegionAdvisorProps) {
  const {
    proposal,
    selectedRegion,
    setSelectedRegion,
    totalMonthlyCost,
    securityScore,
    securityControls,
    deployedServices,
    addProposal,
    setAllSecurityControls,
  } = useAws();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'backend-welcome',
      sender: 'bot',
      text: 'Soy el recomendador AWS conectado al backend. Consulto el catálogo, los costos y la postura IAM de tu propuesta actual.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [executedActionId, setExecutedActionId] = useState<string | null>(null);
  const [activeCategoryTab, setActiveCategoryTab] = useState(0);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  const handleSend = async (textToSend?: string) => {
    const query = (textToSend || input).trim();
    if (!query || isTyping) return;
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setMessages((current) => [...current, { id: `user-${Date.now()}`, sender: 'user', text: query, timestamp }]);
    setInput('');
    setIsTyping(true);
    try {
      const response = await awsApi.advisorQuery({
        query,
        proposal_id: proposal?.id || null,
        selected_region: selectedRegion,
        selected_services: deployedServices,
        security_controls: securityControls,
      });
      setMessages((current) => [...current, {
        id: `backend-${Date.now()}`,
        sender: 'bot',
        text: response.text,
        timestamp: response.timestamp,
        detailsCard: response.details_card,
        action: response.action && {
          type: response.action.type as MessageAction['type'],
          label: response.action.label,
          payload: response.action.payload,
        },
      }]);
    } catch (error) {
      setMessages((current) => [...current, {
        id: `error-${Date.now()}`,
        sender: 'bot',
        text: error instanceof Error ? error.message : 'No se pudo consultar el recomendador del backend.',
        timestamp,
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleExecuteAction = (action: MessageAction, messageId: string) => {
    if (action.type === 'apply_region') setSelectedRegion(action.payload);
    if (action.type === 'apply_architecture') addProposal(action.payload);
    if (action.type === 'apply_security') setAllSecurityControls(action.payload);
    setExecutedActionId(messageId);
  };

  if (!isOpen) return null;

  return (
    <aside aria-label="Recomendador AWS conectado al backend" style={{ width: 410, height: '100%', background: '#fff', borderLeft: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', boxShadow: '-8px 0 30px rgba(0,0,0,.08)', zIndex: 50, flexShrink: 0 }}>
      <div style={{ padding: '14px 18px', background: 'linear-gradient(135deg,#0f172a,#1e293b)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: '#2563eb', display: 'grid', placeItems: 'center' }}><Bot size={20} /></div>
          <div><div style={{ fontSize: 14, fontWeight: 800 }}>AWS Cloud Advisor</div><span style={{ fontSize: 11, color: '#94a3b8' }}>Datos reales del backend</span></div>
        </div>
        <button onClick={onClose} aria-label="Cerrar recomendador" style={{ background: 'rgba(255,255,255,.1)', border: 0, borderRadius: 6, width: 28, height: 28, color: '#cbd5e1', cursor: 'pointer' }}><X size={16} /></button>
      </div>

      <div style={{ padding: '8px 14px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', fontSize: 11, display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 6, color: '#475569' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Globe size={12} color="#2563eb" />{selectedRegion.split(' ')[0] || 'Sin región'}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'center' }}><DollarSign size={12} color="#f59e0b" /><strong>${totalMonthlyCost.toFixed(0)}/m</strong></div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end' }}><ShieldCheck size={12} color="#16a34a" /><strong>{securityScore}/100</strong></div>
      </div>

      <div style={{ flex: 1, padding: 14, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 14, background: '#f8fafc' }}>
        {messages.map((message) => (
          <div key={message.id} style={{ display: 'flex', flexDirection: 'column', alignItems: message.sender === 'user' ? 'flex-end' : 'flex-start', gap: 4 }}>
            <div style={{ display: 'flex', gap: 8, maxWidth: '94%', flexDirection: message.sender === 'user' ? 'row-reverse' : 'row' }}>
              <div style={{ width: 26, height: 26, borderRadius: '50%', background: message.sender === 'user' ? '#2563eb' : '#0f172a', color: '#fff', display: 'grid', placeItems: 'center', flexShrink: 0 }}>{message.sender === 'user' ? <User size={13} /> : <Zap size={13} color="#f59e0b" />}</div>
              <div style={{ background: message.sender === 'user' ? '#2563eb' : '#fff', color: message.sender === 'user' ? '#fff' : '#1e293b', padding: '10px 14px', borderRadius: 12, fontSize: 12.5, lineHeight: 1.5, border: message.sender === 'user' ? 0 : '1px solid #e2e8f0', whiteSpace: 'pre-line' }}>
                {message.text}
                {message.detailsCard && <div style={{ marginTop: 10, background: '#f1f5f9', borderRadius: 10, padding: 12, border: '1.5px solid #bfdbfe', color: '#1e293b', fontSize: 12 }}>
                  <div style={{ fontWeight: 800, marginBottom: 7 }}>{message.detailsCard.title} <span style={{ float: 'right', color: '#1d4ed8', fontSize: 10 }}>{message.detailsCard.badge}</span></div>
                  {message.detailsCard.items.map((item) => <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, margin: '4px 0' }}><span style={{ color: '#64748b' }}>{item.label}</span><strong style={{ textAlign: 'right' }}>{item.value}</strong></div>)}
                  {message.detailsCard.pros?.map((item) => <div key={item} style={{ display: 'flex', gap: 5, color: '#475569', fontSize: 11, marginTop: 3 }}><Check size={12} color="#16a34a" />{item}</div>)}
                </div>}
                {message.action && <button onClick={() => handleExecuteAction(message.action!, message.id)} style={{ width: '100%', marginTop: 10, background: executedActionId === message.id ? '#16a34a' : '#2563eb', color: '#fff', border: 0, borderRadius: 7, padding: '8px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', justifyContent: 'center', gap: 6 }}>{executedActionId === message.id ? <><Check size={14} />Aplicado</> : <>{message.action.label}<ArrowRight size={13} /></>}</button>}
              </div>
            </div>
            <span style={{ fontSize: 10, color: '#94a3b8', padding: '0 34px' }}>{message.timestamp}</span>
          </div>
        ))}
        {isTyping && <div style={{ color: '#64748b', fontSize: 11.5 }}>Consultando catálogo y estado real del backend...</div>}
        <div ref={chatEndRef} />
      </div>

      <div style={{ padding: '10px 12px', background: '#fff', borderTop: '1px solid #f1f5f9', display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ display: 'flex', gap: 4, overflowX: 'auto' }}>{quickPromptCategories.map((category, index) => <button key={category.label} onClick={() => setActiveCategoryTab(index)} style={{ background: activeCategoryTab === index ? '#eff6ff' : '#f8fafc', border: activeCategoryTab === index ? '1.5px solid #2563eb' : '1px solid #e2e8f0', color: activeCategoryTab === index ? '#1d4ed8' : '#64748b', borderRadius: 14, padding: '3px 9px', fontSize: 11, fontWeight: 700, display: 'flex', gap: 4, alignItems: 'center' }}>{category.icon}{category.label}</button>)}</div>
        <div style={{ display: 'flex', gap: 5, overflowX: 'auto' }}>{quickPromptCategories[activeCategoryTab].prompts.map((prompt) => <button key={prompt} onClick={() => void handleSend(prompt)} style={{ whiteSpace: 'nowrap', background: '#f8fafc', border: '1px solid #e2e8f0', color: '#475569', borderRadius: 6, padding: '5px 8px', fontSize: 10.5, cursor: 'pointer' }}>{prompt}</button>)}</div>
        <div style={{ display: 'flex', gap: 7 }}><input value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') void handleSend(); }} placeholder="Pregunta al backend..." style={{ flex: 1, border: '1px solid #cbd5e1', borderRadius: 8, padding: '8px 10px', fontSize: 12, outline: 'none' }} /><button onClick={() => void handleSend()} disabled={isTyping || !input.trim()} aria-label="Enviar consulta" style={{ width: 35, border: 0, borderRadius: 8, background: '#2563eb', color: '#fff', cursor: 'pointer', display: 'grid', placeItems: 'center' }}><Send size={15} /></button></div>
      </div>
    </aside>
  );
}
