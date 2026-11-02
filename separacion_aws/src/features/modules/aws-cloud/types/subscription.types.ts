/**
 * Contratos TypeScript del plan Freemium de Cloud Diagnostix.
 * Conecta la cuota de 2 intentos por correo con el Gatekeeper FastAPI.
 */

// ==========================================================
// Contratos de cuota y pago
// ==========================================================

export type SubscriptionPlanType = 'free' | 'premium';

export interface SubscriptionQuotaStatus {
  user_id?: string;
  email: string;
  intentos_usados: number;
  max_intentos: number | null;
  intentos_restantes: number | null;
  plan_actual: SubscriptionPlanType;
  can_execute?: boolean;
}

export interface LimitReachedErrorDetail {
  error: 'LIMIT_REACHED';
  message: string;
  email: string;
  intentos_usados: number;
  max_intentos: number;
  plan_actual: SubscriptionPlanType;
  upgrade_url: string;
}

export interface CheckoutSessionResponse {
  checkout_url: string;
  session_id: string;
  provider: 'stripe' | 'mercadopago';
  email: string;
  plan_target: string;
  amount_usd: number;
  currency: string;
}
