/**
 * Badge compacto de cuota Freemium.
 * Muestra los intentos usados y permite abrir el plan cuando se alcanza el límite.
 */

import { Crown, Gauge } from 'lucide-react';
import { useSubscription } from '../context/SubscriptionContext';

export default function AwsTrialCounterBadge() {
  const { email, intentosUsados, maxIntentos, intentosRestantes, planActual, openPaywallModal, openEmailGate } =
    useSubscription();
  const isPremium = planActual === 'premium';

  return (
    <button
      type="button"
      className={`subscription-counter ${isPremium ? 'subscription-counter-premium' : ''}`}
      onClick={() => (isPremium ? undefined : email ? openPaywallModal() : openEmailGate())}
      title={isPremium ? 'Plan Premium activo' : 'Ver opciones de suscripción'}
    >
      {isPremium ? <Crown size={14} /> : <Gauge size={14} />}
      <span>
        {isPremium ? 'Premium activo' : `Free · ${intentosUsados}/${maxIntentos}`}
      </span>
      {!isPremium && <small>{intentosRestantes} {intentosRestantes === 1 ? 'intento' : 'intentos'}</small>}
    </button>
  );
}
