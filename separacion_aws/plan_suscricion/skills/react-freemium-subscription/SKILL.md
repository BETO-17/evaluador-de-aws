---
name: react-freemium-subscription
description: >-
  Implementa en el frontend de React + TypeScript el modelo de prueba interactiva
  Freemium de 2 intentos gratuitos por correo electrónico (plan_suscripcion.txt),
  incluyendo el interceptor de errores HTTP 402/403 (LIMIT_REACHED), el contexto
  SubscriptionContext, el captura de correo EmailTrialGate y el Modal de Suscripción
  Premium (Paywall /pricing) conectado a Stripe o MercadoPago.
---

# Skill Frontend (React + TypeScript): Flujo Freemium de 2 Intentos y Suscripción (`react-freemium-subscription`)

Esta skill guía la construcción en **React 19 + TypeScript** de toda la capa de cliente para el modelo **Freemium de 2 intentos gratuitos por correo** y conversión a **Plan Premium** descrito en `plan_suscripcion.txt`.

---

## 1. Estructura de Archivos a Crear en el Proyecto React + TypeScript

Integra estos módulos dentro de `src/features/modules/aws-cloud/` en tu proyecto frontend:

```text
src/features/modules/aws-cloud/
├── types/
│   └── subscription.types.ts                # Tipos e interfaces TS (Plan, Estado, Error LIMIT_REACHED)
├── services/
│   ├── analyzerService.ts                   # Servicio existente conectado al interceptor Freemium
│   └── subscriptionInterceptor.ts           # Fetch wrapper que intercepta HTTP 402/403 LIMIT_REACHED
├── context/
│   └── SubscriptionContext.tsx              # Estado global (email, intentosUsados, planActual, PaywallModal)
└── components/
    ├── AwsEmailTrialGateModal.tsx           # Pide el correo antes de usar los 2 intentos gratis
    ├── AwsSubscriptionPaywallModal.tsx      # Modal de precios/pago que se abre en el 3er intento
    └── AwsTrialCounterBadge.tsx             # Badge superior: "Plan Free: 1/2 intentos" o "Premium"
```

---

## 2. Flujo Paso a Paso en React + TypeScript

### Paso 1: Definir los Contratos TypeScript (`subscription.types.ts`)
Define las interfaces exactas que devuelve el Gatekeeper de FastAPI:
- `PlanType = 'free' | 'premium'`
- `SubscriptionQuotaStatus`: `{ email: string; intentos_usados: number; max_intentos: number; intentos_restantes: number; plan_actual: PlanType }`
- `LimitReachedErrorDetail`: `{ error: 'LIMIT_REACHED'; message: string; email: string; intentos_usados: number; max_intentos: number; plan_actual: 'free'; upgrade_url: string }`

### Paso 2: Crear el Interceptor de Red (`subscriptionInterceptor.ts`)
- Envuelve las llamadas `fetch` de `analyzerService.ts` (`evaluate-zip`, `evaluate-github`, `proposals`) con `fetchWithSubscriptionGuard(...)`.
- Inyecta automáticamente el encabezado `X-User-Email: <correo_actual>`.
- Si `response.status === 402 || response.status === 403`:
  - Parsea el cuerpo JSON y verifica si `data?.detail?.error === 'LIMIT_REACHED' || data?.error === 'LIMIT_REACHED'`.
  - Dispara el evento global `window.dispatchEvent(new CustomEvent('clouddiagnostix:limit-reached', { detail }))` para que `SubscriptionContext` abra inmediatamente el `AwsSubscriptionPaywallModal` sin mostrar un error técnico crudo al usuario.

### Paso 3: Proveedor de Contexto (`SubscriptionContext.tsx`)
- Mantiene en estado (y sincronizado con `localStorage` + `GET /api/v1/subscriptions/status`):
  - `email`: correo del usuario actual.
  - `intentosUsados`: `0`, `1` o `2`.
  - `planActual`: `'free'` | `'premium'`.
  - `isPaywallOpen`: `boolean` que se activa automáticamente cuando el interceptor captura `LIMIT_REACHED` en el 3er intento.

### Paso 4: Modal de Conversión a Suscripción (`AwsSubscriptionPaywallModal.tsx`)
- Cuando el usuario intenta ejecutar la acción por **tercera vez** (`intentosUsados >= 2` en plan `'free'`), este modal bloquea el uso de la herramienta y muestra:
  - Indicador visual de **`2 / 2 intentos gratuitos utilizados`** asociados a su correo.
  - Beneficios del **Plan Premium Cloud Architect** (Auditorías REA ilimitadas, Gemini 2.5 Flash, Exportación XML Draw.io AWS4 y Ficha Técnica PDF).
  - Botón de pago conectado a `POST /api/v1/subscriptions/checkout` (Stripe / MercadoPago) y botón de verificación de estado tras el pago.

---

## 3. Código Completo Listo para Copiar

Lee el archivo [`references/react_typescript_code_templates.md`](./references/react_typescript_code_templates.md) para obtener la implementación completa en TypeScript y React con todos los comentarios arquitectónicos e inline requeridos.

