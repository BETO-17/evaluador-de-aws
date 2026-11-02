/**
 * =============================================================================
 * PROYECTO: Cloud Diagnostix — AWS Cloud Suite Frontend (React + TypeScript)
 * MÓDULO: src/features/modules/aws-cloud/components/AwsSubscriptionPaywallModal.tsx
 * CAPA ARQUITECTÓNICA: UI Component (Modal de Bloqueo y Conversión a Premium)
 * DESCRIPCIÓN:
 *   Se despliega automáticamente cuando el usuario intenta realizar una tercera
 *   acción con su correo gratuito y el backend devuelve HTTP 402/403 con
 *   `{"error": "LIMIT_REACHED"}`. Permite adquirir la suscripción Premium.
 * REFERENCIA: plan_suscripcion.txt (Sección 3 y 4)
 * =============================================================================
 */

import React, { useState } from 'react';
import { useSubscription } from '../context/SubscriptionContext';

export const AwsSubscriptionPaywallModal: React.FC = () => {
  const {
    email,
    intentosUsados,
    maxIntentos,
    planActual,
    isPaywallOpen,
    paywallMessage,
    startPremiumCheckout,
    closePaywallModal,
  } = useSubscription();

  const [loading, setLoading] = useState(false);

  if (!isPaywallOpen || planActual === 'premium') {
    return null;
  }

  const handleUpgrade = async (provider: 'stripe' | 'mercadopago') => {
    setLoading(true);
    try {
      await startPremiumCheckout(provider);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-2xl border border-amber-500/40 bg-slate-900 p-6 text-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <span className="rounded-full bg-amber-500/20 px-3 py-1 text-xs font-semibold text-amber-400">
            LÍMITE FREEMIUM ALCANZADO ({intentosUsados}/{maxIntentos} INTENTOS USADOS)
          </span>
          <button
            onClick={closePaywallModal}
            className="text-slate-400 hover:text-white text-sm"
          >
            Cerrar
          </button>
        </div>

        <h2 className="mt-4 text-xl font-bold text-white">
          Desbloquea Cloud Diagnostix Premium
        </h2>
        <p className="mt-2 text-sm text-slate-300">{paywallMessage}</p>

        {email && (
          <div className="mt-3 rounded-lg bg-slate-800/80 px-3 py-2 text-xs text-slate-300">
            Correo registrado: <strong className="text-amber-300">{email}</strong>
          </div>
        )}

        <ul className="mt-5 space-y-2 text-sm text-slate-200">
          <li>✓ Auditorías REA de código (.zip y GitHub) ilimitadas</li>
          <li>✓ Motor de IA Google Gemini 2.5 Flash + 3 Escenarios FinOps</li>
          <li>✓ Exportación ilimitada de diagramas Draw.io (mxgraph.aws4) y Ficha PDF</li>
          <li>✓ Evaluación completa de postura de seguridad IAM (0-100 pts)</li>
        </ul>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <button
            disabled={loading}
            onClick={() => handleUpgrade('stripe')}
            className="flex-1 rounded-xl bg-amber-500 px-4 py-3 text-sm font-bold text-slate-950 hover:bg-amber-400 disabled:opacity-50"
          >
            {loading ? 'Procesando...' : 'Suscribirse con Stripe ($29/mes)'}
          </button>
          <button
            disabled={loading}
            onClick={() => handleUpgrade('mercadopago')}
            className="flex-1 rounded-xl border border-sky-400/50 bg-sky-500/20 px-4 py-3 text-sm font-semibold text-sky-200 hover:bg-sky-500/30 disabled:opacity-50"
          >
            Pagar con MercadoPago
          </button>
        </div>
      </div>
    </div>
  );
};

