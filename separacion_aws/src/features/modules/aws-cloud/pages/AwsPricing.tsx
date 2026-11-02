/**
 * Página pública de planes de Cloud Diagnostix.
 * Traduce plan_suscripcion.md a una experiencia de comparación y conversión.
 */

import { ArrowRight, Check, ChevronDown, Cloud, Crown, ShieldCheck, Sparkles, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useSubscription } from '../context/SubscriptionContext';
import AwsTrialCounterBadge from '../components/AwsTrialCounterBadge';
import './AwsPricing.css';

const FAQS = [
  ['¿Cómo funcionan los 2 intentos gratis?', 'Registra tu correo y puedes ejecutar dos auditorías REA completas. El contador queda asociado a tu cuenta para que puedas continuar desde cualquier dispositivo.'],
  ['¿Qué incluye Premium?', 'Auditorías ilimitadas, escenarios FinOps, exportaciones Draw.io AWS4, ficha técnica PDF y controles de seguridad IAM.'],
  ['¿Puedo cambiar de proveedor de pago?', 'Sí. Puedes iniciar el checkout con Stripe o Mercado Pago; ambos actualizan el mismo plan Premium.'],
];

export default function AwsPricing() {
  const navigate = useNavigate();
  const { email, planActual, startPremiumCheckout, openEmailGate } = useSubscription();
  const [openFaq, setOpenFaq] = useState(0);

  const handlePremiumClick = () => {
    if (!email) {
      openEmailGate();
      return;
    }
    void startPremiumCheckout('stripe');
  };

  return (
    <main className="pricing-page">
      <nav className="pricing-nav">
        <button type="button" className="pricing-brand" onClick={() => navigate('/')}>
          <span className="pricing-brand-mark"><Cloud size={20} /></span>
          <span><strong>Cloud Diagnostix<span>.</span></strong><small>CLOUD MANAGEMENT SUITE</small></span>
        </button>
        <div className="pricing-nav-actions">
          <AwsTrialCounterBadge />
          <button type="button" className="pricing-nav-link" onClick={() => navigate('/')}>
            Volver al inicio
          </button>
          <button type="button" className="pricing-nav-cta" onClick={() => navigate(email ? '/modules/aws/planning' : '/login')}>
            {email ? 'Ir a la suite' : 'Iniciar sesión'} <ArrowRight size={15} />
          </button>
        </div>
      </nav>

      <section className="pricing-hero">
        <div className="pricing-hero-orb pricing-hero-orb-one" />
        <div className="pricing-hero-orb pricing-hero-orb-two" />
        <div className="pricing-hero-copy">
          <span className="pricing-kicker"><Sparkles size={14} /> Planes para cada etapa cloud</span>
          <h1>Construye con precisión.<br /><em>Escala sin límites.</em></h1>
          <p>Empieza con dos diagnósticos gratuitos y desbloquea todo el criterio técnico que necesitas para diseñar arquitecturas AWS sólidas.</p>
          <div className="pricing-hero-meta"><span><ShieldCheck size={15} /> Sin tarjeta para comenzar</span><span><Zap size={15} /> Resultados con IA + REA</span></div>
        </div>
        <div className="pricing-hero-signal">
          <div className="pricing-signal-ring"><div><strong>2</strong><span>intentos gratis</span></div></div>
          <span className="pricing-signal-line pricing-signal-line-one" />
          <span className="pricing-signal-line pricing-signal-line-two" />
          <div className="pricing-signal-label"><span className="pricing-signal-dot" /> Motor REA listo para analizar</div>
        </div>
      </section>

      <section className="pricing-content">
        <div className="pricing-section-heading">
          <span className="pricing-kicker pricing-kicker-light">COMPARA Y ELIGE</span>
          <h2>El plan que acompaña tu arquitectura</h2>
          <p>La prueba te permite validar el producto. Premium te acompaña desde el primer diagrama hasta producción.</p>
        </div>

        <div className="pricing-cards">
          <article className="pricing-card pricing-card-free">
            <div className="pricing-card-head"><span className="pricing-card-icon"><Cloud size={19} /></span><span className="pricing-card-tag">PARA EXPLORAR</span></div>
            <h3>Free Trial</h3>
            <p className="pricing-card-description">Conoce el motor de diagnóstico con tu primer proyecto cloud.</p>
            <div className="pricing-price"><strong>$0</strong><span>para empezar</span></div>
            <button type="button" className="pricing-card-btn pricing-card-btn-light" onClick={() => (email ? navigate('/modules/aws/planning') : openEmailGate())}>
              {email ? 'Abrir analizador' : 'Activar prueba'} <ArrowRight size={16} />
            </button>
            <span className="pricing-card-note">No requiere tarjeta</span>
            <div className="pricing-divider" />
            <strong className="pricing-includes-title">Incluye:</strong>
            <ul className="pricing-feature-list">
              <li><Check size={15} /> 2 auditorías por correo</li>
              <li><Check size={15} /> Análisis ZIP o GitHub</li>
              <li><Check size={15} /> Recomendaciones AWS iniciales</li>
              <li className="pricing-feature-muted"><span>×</span> Exportaciones avanzadas</li>
            </ul>
          </article>

          <article className="pricing-card pricing-card-premium">
            <div className="pricing-popular"><Crown size={13} /> MÁS ELEGIDO POR EQUIPOS CLOUD</div>
            <div className="pricing-card-head"><span className="pricing-card-icon pricing-card-icon-premium"><Crown size={19} /></span><span className="pricing-card-tag">PARA CONSTRUIR</span></div>
            <h3>Cloud Architect <span>Premium</span></h3>
            <p className="pricing-card-description">La suite completa para convertir decisiones técnicas en arquitecturas defendibles.</p>
            <div className="pricing-price"><strong>$29</strong><span>/mes · USD</span></div>
            <button type="button" className="pricing-card-btn pricing-card-btn-premium" onClick={handlePremiumClick} disabled={planActual === 'premium'}>
              {planActual === 'premium' ? 'Premium activo' : 'Desbloquear Premium'} <ArrowRight size={16} />
            </button>
            <span className="pricing-card-note">Cancela cuando quieras</span>
            <div className="pricing-divider" />
            <strong className="pricing-includes-title">Todo en Free, más:</strong>
            <ul className="pricing-feature-list pricing-feature-list-premium">
              <li><Check size={15} /> Auditorías REA ilimitadas</li>
              <li><Check size={15} /> Gemini 2.5 Flash + FinOps</li>
              <li><Check size={15} /> Draw.io AWS4 + Ficha PDF</li>
              <li><Check size={15} /> Seguridad IAM y soporte de diseño</li>
            </ul>
          </article>
        </div>

        <div className="pricing-comparison">
          <div><span className="pricing-comparison-icon"><ShieldCheck size={18} /></span><div><strong>Tu arquitectura, con respaldo técnico</strong><p>Resultados trazables para decisiones de migración, seguridad y costos.</p></div></div>
          <span className="pricing-comparison-badge">AWS Well-Architected</span>
        </div>

        <section className="pricing-faq">
          <div className="pricing-section-heading pricing-faq-heading"><span className="pricing-kicker pricing-kicker-light">PREGUNTAS FRECUENTES</span><h2>Todo claro antes de empezar</h2></div>
          {FAQS.map(([question, answer], index) => (
            <div className={`pricing-faq-item ${openFaq === index ? 'is-open' : ''}`} key={question}>
              <button type="button" onClick={() => setOpenFaq(openFaq === index ? -1 : index)}><span>{question}</span><ChevronDown size={18} /></button>
              {openFaq === index && <p>{answer}</p>}
            </div>
          ))}
        </section>
      </section>

      <footer className="pricing-footer"><span>Cloud Diagnostix<span>.</span> · Plataforma de Diagnóstico y Arquitectura AWS</span><span>Planes simples. Decisiones sólidas.</span></footer>
    </main>
  );
}
