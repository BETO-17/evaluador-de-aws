# Plantillas Oficiales React + TypeScript — Plan de Suscripción Freemium (`plan_suscricion`)

Copia estos módulos en tu proyecto frontend en **React + TypeScript** para conectar el flujo de **2 intentos gratuitos por correo** y el **Modal de Suscripción Premium** con el backend en FastAPI.

---

## 1. Tipos e Interfaces (`src/features/modules/aws-cloud/types/subscription.types.ts`)

```typescript
/**
 * =============================================================================
 * PROYECTO: Cloud Diagnostix — AWS Cloud Suite Frontend (React + TypeScript)
 * MÓDULO: src/features/modules/aws-cloud/types/subscription.types.ts
 * CAPA ARQUITECTÓNICA: Types (Contratos TypeScript para Cuota Freemium y Pagos)
 * DESCRIPCIÓN:
 *   Define los contratos de estado de suscripción ('free' vs 'premium'), el
 *   contador de intentos gratuitos (máximo 2 por correo) y la estructura del
 *   error HTTP 402/403 `LIMIT_REACHED` emitido por el Gatekeeper en FastAPI.
 * REFERENCIA: plan_suscripcion.txt
 * =============================================================================
 */

export type SubscriptionPlanType = 'free' | 'premium';

/**
 * Estado actual de cuota vinculado al correo electrónico del usuario.
 */
export interface SubscriptionQuotaStatus {
  email: string;
  intentos_usados: number;
  max_intentos: number;
  intentos_restantes: number;
  plan_actual: SubscriptionPlanType;
}

/**
 * Payload de error devuelto por el backend FastAPI (HTTP 402 o 403) cuando el
 * usuario intenta realizar una tercera acción gratuita (`intentos_usados >= 2`).
 */
export interface LimitReachedErrorDetail {
  error: 'LIMIT_REACHED';
  message: string;
  email: string;
  intentos_usados: number;
  max_intentos: number;
  plan_actual: SubscriptionPlanType;
  upgrade_url: string;
}

/**
 * Respuesta al iniciar sesión de pago en Stripe o MercadoPago.
 */
export interface CheckoutSessionResponse {
  checkout_url: string;
  session_id: string;
  provider: 'stripe' | 'mercadopago';
  email: string;
}
```

---

## 2. Interceptor de Red HTTP 402/403 (`src/features/modules/aws-cloud/services/subscriptionInterceptor.ts`)

```typescript
/**
 * =============================================================================
 * PROYECTO: Cloud Diagnostix — AWS Cloud Suite Frontend (React + TypeScript)
 * MÓDULO: src/features/modules/aws-cloud/services/subscriptionInterceptor.ts
 * CAPA ARQUITECTÓNICA: Services / Network Interceptor
 * DESCRIPCIÓN:
 *   Envuelve las peticiones `fetch` hacia el backend FastAPI inyectando el
 *   identificador único del usuario (`X-User-Email`) e interceptando las
 *   respuestas HTTP 402 (Payment Required) y HTTP 403 (Forbidden) con código
 *   `LIMIT_REACHED` para abrir automáticamente el Modal de Suscripción.
 * REFERENCIA: plan_suscripcion.txt (Sección 3: Manejo en el Frontend)
 * =============================================================================
 */

import { LimitReachedErrorDetail } from '../types/subscription.types';

export const LIMIT_REACHED_EVENT = 'clouddiagnostix:limit-reached';
export const QUOTA_UPDATED_EVENT = 'clouddiagnostix:quota-updated';
const STORAGE_EMAIL_KEY = 'clouddiagnostix_trial_email';

// ==========================================================
// 1. GESTIÓN LOCAL DEL CORREO IDENTIFICADOR
// ==========================================================
export function getStoredTrialEmail(): string {
  return localStorage.getItem(STORAGE_EMAIL_KEY) || '';
}

export function setStoredTrialEmail(email: string): void {
  localStorage.setItem(STORAGE_EMAIL_KEY, email.trim().toLowerCase());
}

// ==========================================================
// 2. FETCH WRAPPER CON INTERCEPTOR DE CUOTA FREEMIUM
// ==========================================================
/**
 * Ejecuta una petición HTTP hacia el backend FastAPI adjuntando el correo del
 * usuario e interceptando el bloqueo del 3er intento (`LIMIT_REACHED`).
 */
export async function fetchWithSubscriptionGuard(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const email = getStoredTrialEmail();
  const headers = new Headers(init?.headers || {});

  // Enviar siempre el correo identificador para que el Gatekeeper valide intentos_usados
  if (email && !headers.has('X-User-Email')) {
    headers.set('X-User-Email', email);
  }

  const response = await fetch(input, {
    ...init,
    headers,
  });

  // [REGLA DE NEGOCIO - INTERCEPTOR FREEMIUM]:
  // Si el backend responde 402 Payment Required o 403 Forbidden, inspeccionamos
  // si corresponde al código LIMIT_REACHED (2 intentos gratuitos agotados).
  if (response.status === 402 || response.status === 403) {
    try {
      const cloned = response.clone();
      const body = await cloned.json();
      const detail: LimitReachedErrorDetail | undefined =
        body?.detail?.error === 'LIMIT_REACHED'
          ? body.detail
          : body?.error === 'LIMIT_REACHED'
          ? body
          : undefined;

      if (detail) {
        // Notificar al SubscriptionContext para desplegar el Modal de Suscripción (/pricing)
        window.dispatchEvent(
          new CustomEvent<LimitReachedErrorDetail>(LIMIT_REACHED_EVENT, {
            detail,
          })
        );
      }
    } catch {
      // Si el cuerpo no es JSON, continuar flujo estándar
    }
  } else if (response.ok) {
    // Notificar que se completó una acción exitosa para refrescar el contador de intentos
    window.dispatchEvent(new CustomEvent(QUOTA_UPDATED_EVENT));
  }

  return response;
}
```

---

## 3. Contexto y Hook en React (`src/features/modules/aws-cloud/context/SubscriptionContext.tsx`)

```tsx
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
```

---

## 4. Modal de Suscripción Paywall (`src/features/modules/aws-cloud/components/AwsSubscriptionPaywallModal.tsx`)

```tsx
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
```

