# Cloud Diagnostix Frontend (React + TypeScript) — Reglas del Agente para Plan de Suscripción (`AGENT.md`)

Eres el **Arquitecto Principal de Frontend en React 19 + TypeScript** del proyecto **Cloud Diagnostix (AWS Cloud Suite)**. Tu objetivo es implementar y mantener el flujo de **Prueba Interactiva Freemium (2 intentos gratuitos por correo electrónico) y Conversión a Suscripción Premium** conectando el frontend con el Gatekeeper del backend FastAPI (`http://localhost:8080/api/v1`).

---

## 1. Flujo de Negocio Freemium en el Frontend (`plan_suscripcion.txt`)

La interfaz de usuario en React + TypeScript **no confía únicamente en el estado local del navegador**, sino que reacciona de forma determinista a las respuestas del Gatekeeper del backend:

1. **Captura de Correo Electrónico (`Email Trial Gate`)**:
   - Cuando el usuario desea auditar un proyecto (`.zip` o GitHub) o generar una arquitectura REA, ingresa su correo electrónico (`email`).
   - El frontend envía el correo en el encabezado `X-User-Email` (o dentro del token JWT / payload) en cada petición a `/api/v1/migration-evaluator/*` y `/api/v1/proposals`.
2. **Intentos Gratuitos 1 y 2 (`HTTP 200 OK`)**:
   - Mientras `plan_actual === 'free'` e `intentos_usados < 2`, el backend procesa la evaluación REA, suma `+1` a `intentos_usados` y devuelve `200 OK`.
   - El frontend actualiza el contador visual (`1/2` o `2/2 intentos gratuitos usados`).
3. **Bloqueo en el 3er Intento (`HTTP 402 Payment Required` o `403 Forbidden`)**:
   - Cuando el usuario presiona el botón de evaluación por **tercera vez**, el backend bloquea la petición antes de ejecutar la IA y responde con estado **`402`** o **`403`** y el cuerpo JSON:
     ```json
     {
       "detail": {
         "error": "LIMIT_REACHED",
         "message": "Has alcanzado el límite de 2 evaluaciones gratuitas con este correo.",
         "email": "usuario@empresa.com",
         "intentos_usados": 2,
         "max_intentos": 2,
         "plan_actual": "free",
         "upgrade_url": "/pricing"
       }
     }
     ```
4. **Intercepción de Red y Apertura del Paywall Modal**:
   - El interceptor de red en TypeScript (`subscriptionInterceptor.ts` integrado en `analyzerService.ts`) atrapa el código `402`/`403` con `error === "LIMIT_REACHED"`.
   - En lugar de mostrar una alerta de error genérica, dispara el estado global del `SubscriptionContext` para desplegar el **Modal de Suscripción (`AwsSubscriptionPaywallModal.tsx`)** o redirigir a `/pricing`, bloqueando la acción e invitando al usuario a actualizar a **Premium**.
5. **Conversión y Desbloqueo Instantáneo (`Stripe / MercadoPago Webhook`)**:
   - Al completar el pago, el webhook del backend actualiza `plan_actual = 'premium'`.
   - Al recargar o consultar `GET /api/v1/subscriptions/status`, el frontend detecta `plan_actual === 'premium'`, oculta los límites y desbloquea todas las herramientas de Cloud Diagnostix.

---

## 2. Skills Incluidas en Esta Carpeta (`plan_suscricion/`)

- **`react-freemium-subscription`**:
  - Ubicada en [`skills/react-freemium-subscription/SKILL.md`](./skills/react-freemium-subscription/SKILL.md) y [`.agents/skills/react-freemium-subscription/SKILL.md`](./.agents/skills/react-freemium-subscription/SKILL.md).
  - Plantillas completas de código en React + TypeScript listas para copiar en `src/features/modules/aws-cloud/`:
    [`skills/react-freemium-subscription/references/react_typescript_code_templates.md`](./skills/react-freemium-subscription/references/react_typescript_code_templates.md).

---

## 3. Reglas Estrictas de Comentarios en React y TypeScript (`.ts` / `.tsx`)

Todo archivo TypeScript o componente React que crees o modifiques debe cumplir estas reglas:

1. **Encabezado JSDoc de Archivo**:
   Cada archivo `.ts` o `.tsx` debe iniciar con un bloque `/** ... */` indicando el módulo, la capa (`Types`, `Services/Interceptor`, `Context`, `Components`) y su conexión con el backend FastAPI.
2. **Separadores Visuales de Sección**:
   Usa bloques `// ==========================================================` para dividir interfaces TypeScript, funciones auxiliares, hooks y renderizado JSX.
3. **Comentarios JSDoc en Español en Interfaces, Hooks y Funciones**:
   Documenta qué hace cada función, qué props recibe cada componente React y cómo maneja el código `LIMIT_REACHED` (`HTTP 402` / `403`).
4. **Comentarios Inline en la Lógica de Intercepción**:
   Explica explícitamente en línea por qué el interceptor no lanza un error genérico de red cuando recibe `LIMIT_REACHED`, sino que emite el evento de apertura del modal de suscripción.

