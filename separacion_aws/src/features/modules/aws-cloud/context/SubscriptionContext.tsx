/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { LIMIT_REACHED_EVENT, QUOTA_UPDATED_EVENT, getStoredTrialEmail, setStoredTrialEmail } from '../services/subscriptionInterceptor';
import { apiFetch } from '../services/apiClient';
import type { CheckoutSessionResponse, LimitReachedErrorDetail, SubscriptionPlanType, SubscriptionQuotaStatus } from '../types/subscription.types';

interface SubscriptionContextValue {
  email: string;
  intentosUsados: number;
  maxIntentos: number;
  intentosRestantes: number;
  planActual: SubscriptionPlanType;
  isPaywallOpen: boolean;
  isEmailGateOpen: boolean;
  paywallMessage: string;
  isCheckoutLoading: boolean;
  registerTrialEmail: (email: string) => Promise<void>;
  refreshSubscriptionStatus: (email?: string) => Promise<void>;
  startPremiumCheckout: (provider?: 'stripe' | 'mercadopago') => Promise<void>;
  closePaywallModal: () => void;
  openPaywallModal: () => void;
  openEmailGate: () => void;
  closeEmailGate: () => void;
}

const SubscriptionContext = createContext<SubscriptionContextValue | undefined>(undefined);

function applyQuota(data: SubscriptionQuotaStatus, setUsed: (value: number) => void, setMax: (value: number) => void, setPlan: (value: SubscriptionPlanType) => void) {
  setUsed(data.intentos_usados ?? 0);
  setMax(data.max_intentos ?? 2);
  setPlan(data.plan_actual ?? 'free');
}

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const [email, setEmail] = useState(getStoredTrialEmail());
  const [intentosUsados, setIntentosUsados] = useState(0);
  const [maxIntentos, setMaxIntentos] = useState(2);
  const [planActual, setPlanActual] = useState<SubscriptionPlanType>('free');
  const [isPaywallOpen, setIsPaywallOpen] = useState(false);
  const [isEmailGateOpen, setIsEmailGateOpen] = useState(false);
  const [isCheckoutLoading, setIsCheckoutLoading] = useState(false);
  const [paywallMessage, setPaywallMessage] = useState('Has utilizado tus 2 intentos gratuitos. Actualiza al Plan Premium para continuar.');

  const refreshSubscriptionStatus = useCallback(async (targetEmail?: string) => {
    const activeEmail = (targetEmail ?? email).trim().toLowerCase();
    if (!activeEmail) return;
    try {
      const data = await apiFetch<SubscriptionQuotaStatus>(`/subscriptions/status?email=${encodeURIComponent(activeEmail)}`);
      applyQuota(data, setIntentosUsados, setMaxIntentos, setPlanActual);
    } catch {
      // El backend conserva la autoridad; no se inventa un estado offline.
    }
  }, [email]);

  useEffect(() => { if (email) void refreshSubscriptionStatus(email); }, [email, refreshSubscriptionStatus]);

  const registerTrialEmail = useCallback(async (newEmail: string) => {
    const cleanEmail = newEmail.trim().toLowerCase();
    setStoredTrialEmail(cleanEmail);
    setEmail(cleanEmail);
    setIsEmailGateOpen(false);
    const data = await apiFetch<SubscriptionQuotaStatus>('/subscriptions/register-trial', { method: 'POST', body: JSON.stringify({ email: cleanEmail }) });
    applyQuota(data, setIntentosUsados, setMaxIntentos, setPlanActual);
  }, []);

  useEffect(() => {
    const handleLimit = (event: Event) => {
      const detail = (event as CustomEvent<LimitReachedErrorDetail>).detail;
      setIntentosUsados(detail?.intentos_usados ?? 2);
      setMaxIntentos(detail?.max_intentos ?? 2);
      setPlanActual('free');
      setPaywallMessage(detail?.message || 'Tu prueba gratuita ha terminado.');
      setIsPaywallOpen(true);
    };
    const handleQuota = () => { void refreshSubscriptionStatus(); };
    window.addEventListener(LIMIT_REACHED_EVENT, handleLimit);
    window.addEventListener(QUOTA_UPDATED_EVENT, handleQuota);
    return () => { window.removeEventListener(LIMIT_REACHED_EVENT, handleLimit); window.removeEventListener(QUOTA_UPDATED_EVENT, handleQuota); };
  }, [refreshSubscriptionStatus]);

  const startPremiumCheckout = useCallback(async (provider: 'stripe' | 'mercadopago' = 'stripe') => {
    if (!email) return setIsEmailGateOpen(true);
    setIsCheckoutLoading(true);
    try {
      const data = await apiFetch<CheckoutSessionResponse>('/subscriptions/checkout', { method: 'POST', body: JSON.stringify({ email, provider, success_url: `${window.location.origin}/pricing?upgraded=true`, cancel_url: `${window.location.origin}/pricing?canceled=true` }) });
      const checkoutUrl = new URL(data.checkout_url, window.location.origin);
      if (checkoutUrl.origin === window.location.origin && checkoutUrl.pathname.includes('pricing')) throw new Error('La pasarela de pago todavía no está configurada en el backend.');
      window.location.href = data.checkout_url;
    } finally {
      setIsCheckoutLoading(false);
    }
  }, [email]);

  return <SubscriptionContext.Provider value={{ email, intentosUsados, maxIntentos, intentosRestantes: Math.max(maxIntentos - intentosUsados, 0), planActual, isPaywallOpen, isEmailGateOpen, paywallMessage, isCheckoutLoading, registerTrialEmail, refreshSubscriptionStatus, startPremiumCheckout, closePaywallModal: () => setIsPaywallOpen(false), openPaywallModal: () => setIsPaywallOpen(true), openEmailGate: () => setIsEmailGateOpen(true), closeEmailGate: () => setIsEmailGateOpen(false) }}>{children}</SubscriptionContext.Provider>;
}

export function useSubscription(): SubscriptionContextValue {
  const context = useContext(SubscriptionContext);
  if (!context) throw new Error('useSubscription debe usarse dentro de <SubscriptionProvider>');
  return context;
}
