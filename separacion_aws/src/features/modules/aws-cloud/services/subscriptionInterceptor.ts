/**
 * Interceptor HTTP del flujo Freemium.
 * Inyecta X-User-Email y traduce 402/403 LIMIT_REACHED a un evento de UI.
 */

import type { LimitReachedErrorDetail } from '../types/subscription.types';

// ==========================================================
// Eventos y persistencia del correo
// ==========================================================

export const LIMIT_REACHED_EVENT = 'clouddiagnostix:limit-reached';
export const QUOTA_UPDATED_EVENT = 'clouddiagnostix:quota-updated';
const STORAGE_EMAIL_KEY = 'clouddiagnostix_trial_email';

export function getStoredTrialEmail(): string {
  return localStorage.getItem(STORAGE_EMAIL_KEY) || '';
}

export function setStoredTrialEmail(email: string): void {
  localStorage.setItem(STORAGE_EMAIL_KEY, email.trim().toLowerCase());
}

// ==========================================================
// Fetch protegido por la cuota del backend
// ==========================================================

/**
 * Ejecuta una petición FastAPI adjuntando el correo y notificando LIMIT_REACHED.
 * El evento evita mostrar un error técnico crudo y permite abrir el paywall.
 */
export async function fetchWithSubscriptionGuard(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const email = getStoredTrialEmail();
  const headers = new Headers(init?.headers || {});

  if (email && !headers.has('X-User-Email')) {
    headers.set('X-User-Email', email);
  }

  const response = await fetch(input, { ...init, headers });

  if (response.status === 402 || response.status === 403) {
    try {
      const body = await response.clone().json();
      const detail: LimitReachedErrorDetail | undefined =
        body?.detail?.error === 'LIMIT_REACHED'
          ? body.detail
          : body?.error === 'LIMIT_REACHED'
            ? body
            : undefined;

      if (detail) {
        // LIMIT_REACHED es una regla de negocio, no un fallo de red:
        // emitimos el evento para que SubscriptionContext abra el paywall.
        window.dispatchEvent(
          new CustomEvent<LimitReachedErrorDetail>(LIMIT_REACHED_EVENT, { detail }),
        );
      }
    } catch {
      // Un cuerpo no JSON continúa por el flujo de error normal del servicio.
    }
  } else if (
    response.ok &&
    (init?.method || 'GET').toUpperCase() !== 'GET' &&
    !String(input).includes('/subscriptions/status')
  ) {
    // Solo las operaciones que pueden cambiar la cuota notifican al contexto.
    // El GET /subscriptions/status no puede notificarse a sí mismo porque
    // provocaría un ciclo infinito de consultas.
    window.dispatchEvent(new CustomEvent(QUOTA_UPDATED_EVENT));
  }

  return response;
}
