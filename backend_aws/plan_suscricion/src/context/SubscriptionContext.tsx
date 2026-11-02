/**
 * =============================================================================
 * PROYECTO: Cloud Diagnostix — AWS Cloud Suite Frontend (React + TypeScript)
 * MÓDULO: src/features/modules/aws-cloud/context/SubscriptionContext.tsx
 * CAPA ARQUITECTÓNICA: Frontend Context & State Management
 * DESCRIPCIÓN:
 *   Gestiona el estado reactivo del plan ('free' | 'premium'), los intentos
 *   usados (0, 1 o 2) y la apertura automática del Paywall Modal cuando el
 *   interceptor de red captura `LIMIT_REACHED` en el tercer intento.
 * REFERENCIA: plan_suscripcion.txt
 * =============================================================================
 */

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  LIMIT_REACHED_EVENT,
  QUOTA_UPDATED_EVENT,
  getStoredTrialEmail,
  setStoredTrialEmail,
} from '../services/subscriptionInterceptor';
import {
  LimitReachedErrorDetail,
  SubscriptionPlanType,
  SubscriptionQuotaStatus,
} from '../types/subscription.types';

interface SubscriptionContextValue {
  email: string;
  intentosUsados: number;
  maxIntentos: number;
  intentosRestantes: number;
  planActual: SubscriptionPlanType;
  isPaywallOpen: boolean;
  paywallMessage: string;
  registerTrialEmail: (newEmail: string) => Promise<void>;
  refreshSubscriptionStatus: () => Promise<void>;
  startPremiumCheckout: (provider?: 'stripe' | 'mercadopago') => Promise<void>;
  closePaywallModal: () => void;
  openPaywallModal: () => void;
}

const SubscriptionContext = createContext<SubscriptionContextValue | undefined>(undefined);

const API_BASE_URL = 'http://localhost:8080/api/v1';

export const SubscriptionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [email, setEmail] = useState<string>(() => getStoredTrialEmail());
  const [intentosUsados, setIntentosUsados] = useState<number>(0);
  const [maxIntentos, setMaxIntentos] = useState<number>(2);
  const [planActual, setPlanActual] = useState<SubscriptionPlanType>('free');
  const [isPaywallOpen, setIsPaywallOpen] = useState<boolean>(false);
  const [paywallMessage, setPaywallMessage] = useState<string>(
    'Has utilizado tus 2 intentos gratuitos. Actualiza al Plan Premium para desbloquear auditorías REA ilimitadas.'
  );

  // ==========================================================
  // 1. SINCRONIZACIÓN DE ESTADO CON EL BACKEND FASTAPI
  // ==========================================================
  const refreshSubscriptionStatus = useCallback(async (targetEmail?: string) => {
    const activeEmail = (targetEmail ?? email).trim().toLowerCase();
    if (!activeEmail) return;

    try {
      const resp = await fetch(
        `${API_BASE_URL}/subscriptions/status?email=${encodeURIComponent(activeEmail)}`
      );
      if (resp.ok) {
        const data: SubscriptionQuotaStatus = await resp.json();
        setIntentosUsados(data.intentos_usados);
        setMaxIntentos(data.max_intentos ?? 2);
        setPlanActual(data.plan_actual);
      }
    } catch {
      // En modo offline mantiene el estado local
    }
  }, [email]);

  // ==========================================================
  // 2. REGISTRO RÁPIDO POR CORREO (2 INTENTOS GRATIS)
  // ==========================================================
  const registerTrialEmail = useCallback(async (newEmail: string) => {
    const clean = newEmail.trim().toLowerCase();
    setStoredTrialEmail(clean);
    setEmail(clean);

    try {
      const resp = await fetch(`${API_BASE_URL}/subscriptions/register-trial`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: clean }),
      });
      if (resp.ok) {
        const data: SubscriptionQuotaStatus = await resp.json();
        setIntentosUsados(data.intentos_usados);
        setMaxIntentos(data.max_intentos ?? 2);
        setPlanActual(data.plan_actual);
      }
    } catch {
      // Fallback local si el servidor aún no responde
    }
  }, []);

  // ==========================================================
  // 3. ESCUCHA DEL INTERCEPTOR HTTP 402/403 (LIMIT_REACHED)
  // ==========================================================
  useEffect(() => {
    const handleLimitReached = (event: Event) => {
      const customEvent = event as CustomEvent<LimitReachedErrorDetail>;
      if (customEvent.detail) {
        setIntentosUsados(customEvent.detail.intentos_usados ?? 2);
        setMaxIntentos(customEvent.detail.max_intentos ?? 2);
        setPlanActual('free');
        if (customEvent.detail.message) {
          setPaywallMessage(customEvent.detail.message);
        }
      }
      // Bloquear acción y desplegar el Modal de Suscripción
      setIsPaywallOpen(true);
    };

    const handleQuotaUpdated = () => {
      refreshSubscriptionStatus();
    };

    window.addEventListener(LIMIT_REACHED_EVENT, handleLimitReached);
    window.addEventListener(QUOTA_UPDATED_EVENT, handleQuotaUpdated);
    return () => {
      window.removeEventListener(LIMIT_REACHED_EVENT, handleLimitReached);
      window.removeEventListener(QUOTA_UPDATED_EVENT, handleQuotaUpdated);
    };
  }, [refreshSubscriptionStatus]);

  // ==========================================================
  // 4. CONVERSIÓN A PLAN PREMIUM (CHECKOUT / WEBHOOK)
  // ==========================================================
  const startPremiumCheckout = useCallback(
    async (provider: 'stripe' | 'mercadopago' = 'stripe') => {
      if (!email) return;
      try {
        const resp = await fetch(`${API_BASE_URL}/subscriptions/checkout`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, provider }),
        });
        if (resp.ok) {
          const data = await resp.json();
          if (data.checkout_url && data.checkout_url.startsWith('http')) {
            window.location.href = data.checkout_url;
            return;
          }
        }
        // En entorno de demostración local, simulamos el disparo del Webhook exitoso
        await fetch(`${API_BASE_URL}/subscriptions/webhook`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event_type: 'checkout.session.completed',
            email,
            provider,
          }),
        });
        await refreshSubscriptionStatus(email);
        setIsPaywallOpen(false);
      } catch {
        // Ignorar errores de red en demo
      }
    },
    [email, refreshSubscriptionStatus]
  );

  const intentosRestantes = Math.max(maxIntentos - intentosUsados, 0);

  return (
    <SubscriptionContext.Provider
      value={{
        email,
        intentosUsados,
        maxIntentos,
        intentosRestantes,
        planActual,
        isPaywallOpen,
        paywallMessage,
        registerTrialEmail,
        refreshSubscriptionStatus,
        startPremiumCheckout,
        closePaywallModal: () => setIsPaywallOpen(false),
        openPaywallModal: () => setIsPaywallOpen(true),
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
};

export function useSubscription(): SubscriptionContextValue {
  const ctx = useContext(SubscriptionContext);
  if (!ctx) {
    throw new Error('useSubscription debe usarse dentro de un <SubscriptionProvider>');
  }
  return ctx;
}

