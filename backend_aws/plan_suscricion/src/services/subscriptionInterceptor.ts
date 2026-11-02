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

