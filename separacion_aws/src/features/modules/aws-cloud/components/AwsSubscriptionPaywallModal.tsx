/**
 * Modal de conversión Premium para HTTP 402/403 LIMIT_REACHED.
 * Presenta beneficios y dispara POST /subscriptions/checkout.
 */

import { Check, CreditCard, Crown, FileDown, Gauge, ShieldCheck, Sparkles, X } from 'lucide-react';
import { useSubscription } from '../context/SubscriptionContext';

const BENEFITS = [
  { icon: Gauge, text: 'Auditorías REA ilimitadas para ZIP y GitHub' },
  { icon: Sparkles, text: 'Gemini 2.5 Flash + 3 escenarios FinOps' },
  { icon: FileDown, text: 'Exportaciones Draw.io AWS4 y Ficha Técnica PDF' },
  { icon: ShieldCheck, text: 'Postura IAM y controles Well-Architected completos' },
];

export default function AwsSubscriptionPaywallModal() {
  const {
    email,
    intentosUsados,
    maxIntentos,
    planActual,
    isPaywallOpen,
    paywallMessage,
    isCheckoutLoading,
    startPremiumCheckout,
    closePaywallModal,
  } = useSubscription();

  if (!isPaywallOpen || planActual === 'premium') return null;

  return (
    <div className="subscription-overlay" role="presentation" onMouseDown={closePaywallModal}>
      <section
        className="subscription-paywall-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="paywall-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="subscription-paywall-glow" />
        <button type="button" className="subscription-modal-close" onClick={closePaywallModal} aria-label="Cerrar">
          <X size={18} />
        </button>
        <div className="subscription-paywall-topline">
          <span className="subscription-limit-pill">LÍMITE ALCANZADO · {intentosUsados}/{maxIntentos}</span>
          <span className="subscription-secure-label"><ShieldCheck size={13} /> Checkout seguro</span>
        </div>
        <div className="subscription-paywall-heading">
          <div className="subscription-modal-icon subscription-modal-icon-amber"><Crown size={22} /></div>
          <div>
            <span className="subscription-eyebrow">CLOUD ARCHITECT PREMIUM</span>
            <h2 id="paywall-title">Lleva tu arquitectura al siguiente nivel</h2>
          </div>
        </div>
        <p className="subscription-modal-copy">{paywallMessage}</p>
        {email && <div className="subscription-email-chip">Cuenta: <strong>{email}</strong></div>}

        <div className="subscription-benefit-list">
          {BENEFITS.map(({ icon: Icon, text }) => (
            <div className="subscription-benefit" key={text}>
              <span className="subscription-check"><Check size={14} /></span>
              <Icon size={17} />
              <span>{text}</span>
            </div>
          ))}
        </div>

        <div className="subscription-paywall-price">
          <div><span>Plan Premium</span><strong>$29<span>/mes</span></strong></div>
          <small>Acceso ilimitado · Cancela cuando quieras</small>
        </div>

        <div className="subscription-payment-actions">
          <button
            type="button"
            className="subscription-primary-btn subscription-payment-btn"
            disabled={isCheckoutLoading}
            onClick={() => void startPremiumCheckout('stripe')}
          >
            <CreditCard size={16} />
            {isCheckoutLoading ? 'Procesando…' : 'Pagar con Stripe'}
          </button>
          <button
            type="button"
            className="subscription-secondary-btn"
            disabled={isCheckoutLoading}
            onClick={() => void startPremiumCheckout('mercadopago')}
          >
            Mercado Pago
          </button>
        </div>
        <p className="subscription-legal">La activación Premium depende de la confirmación real del proveedor de pagos mediante webhook.</p>
      </section>
    </div>
  );
}
