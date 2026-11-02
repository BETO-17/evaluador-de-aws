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

