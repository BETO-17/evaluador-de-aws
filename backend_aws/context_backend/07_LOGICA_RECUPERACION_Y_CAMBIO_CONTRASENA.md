# Lógica propuesta: recuperación y cambio de contraseña

Documento de referencia de la lógica implementada para recuperación y cambio de contraseña.

## 1. Situación actual

El login actual valida:

1. Correo y contraseña.
2. Código de verificación de 6 dígitos enviado al correo registrado.
3. Emisión del JWT definitivo.

El sistema ofrece una opción visible de **“¿Olvidaste tu contraseña?”** y un flujo de recuperación por correo. El error de la captura aparece porque la contraseña enviada no coincide con la registrada; no es un error del código de correo.

Importante: el correo de recuperación no debe enviar la contraseña ni un secreto TOTP. Debe incluir únicamente un enlace temporal y el código de 6 dígitos necesario para confirmar el cambio.

## 2. Flujo recomendado

### Paso A: solicitar recuperación

El usuario selecciona **“¿Olvidaste tu contraseña?”** e ingresa su correo.

Frontend:

```http
POST /api/v1/auth/password-recovery/request
Content-Type: application/json
```

```json
{
  "email": "usuario@dominio.com"
}
```

Backend:

1. Normaliza el correo a minúsculas.
2. Busca el usuario.
3. Si existe, invalida tokens anteriores no utilizados.
4. Genera un token aleatorio criptográficamente seguro.
5. Guarda únicamente el hash del token en la base de datos.
6. Asigna una expiración de 15 minutos.
7. Envía un enlace al correo registrado.
8. Responde siempre con el mismo mensaje, exista o no el correo.

Respuesta pública:

```json
{
  "message": "Si el correo está registrado, recibirás instrucciones para recuperar tu contraseña."
}
```

Esto evita revelar si una cuenta existe.

### Paso B: abrir el enlace

El enlace tendría esta forma:

```text
https://frontend.dominio.com/aws/login/reset-password?token=<token_de_un_solo_uso>
```

El token debe ser:

- De un solo uso.
- Válido durante 15 minutos.
- Invalidado después de cambiar la contraseña.
- Invalidado si se solicita una recuperación nueva.
- Nunca guardado en texto plano en la base de datos.

Frontend:

```http
GET /api/v1/auth/password-recovery/validate?token=<token>
```

Respuesta válida:

```json
{
  "valid": true,
  "email_hint": "us***@dominio.com",
  "expires_at": "2026-11-02T18:30:00Z"
}
```

Respuesta inválida o vencida:

```json
{
  "valid": false,
  "message": "El enlace es inválido o ya expiró. Solicita uno nuevo."
}
```

### Paso C: establecer nueva contraseña

El usuario ingresa la nueva contraseña y su confirmación.

```http
POST /api/v1/auth/password-recovery/confirm
Content-Type: application/json
```

Payload base:

```json
{
  "token": "token_de_un_solo_uso",
  "new_password": "NuevaClaveSegura2026!",
  "confirm_password": "NuevaClaveSegura2026!",
  "email_code": "123456"
}
```

Reglas:

- La contraseña debe tener mínimo 8 caracteres.
- Debe coincidir con `confirm_password`.
- El token debe ser válido, no utilizado y no estar vencido.
- La contraseña anterior se reemplaza usando el hash Argon2/bcrypt existente.
- Se marca el token como utilizado.
- Se invalidan sesiones JWT anteriores mediante `token_version` o `password_changed_at`.
- Se conserva la cuenta y su configuración existente; este flujo no depende de Google Authenticator/Authy.

## 3. Código de correo durante la recuperación

El flujo de recuperación usa el mismo correo registrado para entregar un código temporal:

### Usuario recuerda su autenticador

Debe introducir:

1. Token recibido por correo.
2. Nueva contraseña.
3. Código de 6 dígitos enviado en el correo de recuperación.

Esta es la opción más segura y debe ser el flujo principal.

El código es de un solo uso, expira en el tiempo configurado y se invalida al confirmar la nueva contraseña. No se solicita ningún autenticador externo.

## 4. Tablas y campos necesarios

### Tabla `password_reset_tokens`

```sql
CREATE TABLE password_reset_tokens (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    token_hash VARCHAR(128) NOT NULL UNIQUE,
    expires_at TIMESTAMP NOT NULL,
    used_at TIMESTAMP NULL,
    requested_ip VARCHAR(64) NULL,
    created_at TIMESTAMP NOT NULL,
    CONSTRAINT fk_password_reset_user
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

### Cambios sugeridos en `users`

```sql
ALTER TABLE users ADD COLUMN password_changed_at TIMESTAMP NULL;
ALTER TABLE users ADD COLUMN token_version INTEGER NOT NULL DEFAULT 0;
```

`token_version` permite invalidar los JWT emitidos antes del cambio de contraseña.

## 5. Envío de correo

El backend ya tiene nombres de configuración SMTP en `.env`, pero actualmente no existe un servicio de correo integrado al flujo de autenticación.

Se debe implementar un servicio como:

```text
app/services/email_service.py
```

Variables necesarias:

```env
SMTP_HOST=
SMTP_PORT=587
SMTP_USE_SSL=false
EMAIL_USER=
EMAIL_PASSWORD=
EMAIL_FROM=
FRONTEND_PUBLIC_URL=http://localhost:5173
```

El correo debe incluir:

- Nombre del usuario.
- Enlace de recuperación.
- Tiempo de expiración.
- Aviso de seguridad si el usuario no solicitó el cambio.
- No incluir contraseña, secreto TOTP ni JWT.

Si SMTP no está configurado, el endpoint debe registrar el error internamente y mostrar una respuesta genérica al usuario. No debe devolver el token en la respuesta HTTP.

## 6. Pantallas del frontend

### Login

Agregar debajo de la contraseña:

```text
¿Olvidaste tu contraseña?
```

### Solicitud de recuperación

Ruta sugerida:

```text
/aws/login/forgot-password
```

Elementos:

- Campo de correo.
- Botón “Enviar enlace de recuperación”.
- Mensaje genérico de éxito.
- Opción para volver al login.

### Nueva contraseña

Ruta sugerida:

```text
/aws/login/reset-password?token=<token>
```

Elementos:

- Nueva contraseña.
- Confirmar contraseña.
- Código de correo de 6 dígitos.
- Indicador de fortaleza.
- Mensaje de token vencido.
- Botón “Cambiar contraseña”.

Después del cambio correcto:

1. Limpiar cualquier sesión local anterior.
2. Redirigir al login.
3. Mostrar “Contraseña actualizada. Inicia sesión nuevamente”.

## 7. Protección contra abuso

El backend debe aplicar:

- Máximo 3 solicitudes por correo cada 15 minutos.
- Máximo 10 solicitudes por IP cada 15 minutos.
- Respuesta con el mismo tiempo aproximado para correos existentes y no existentes.
- Token aleatorio de alta entropía.
- Hash del token en base de datos.
- Registro de auditoría sin guardar el token original.
- Limpieza periódica de tokens vencidos.
- No mostrar si el correo está registrado.

## 8. Endpoints finales

| Método | Endpoint | Función |
|---|---|---|
| `POST` | `/api/v1/auth/password-recovery/request` | Solicitar enlace por correo |
| `GET` | `/api/v1/auth/password-recovery/validate` | Validar token temporal |
| `POST` | `/api/v1/auth/password-recovery/confirm` | Cambiar contraseña y validar código de correo |

## 9. Alcance implementado

El flujo queda limitado a estos tres pasos: solicitud del enlace y código, validación del token y confirmación de la nueva contraseña con el código de correo. No se agrega un cambio de contraseña independiente desde el dashboard.
