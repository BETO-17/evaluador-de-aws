"""Envío SMTP de enlaces de recuperación sin exponer secretos ni contraseñas."""

import logging
import smtplib
import ssl
from email.message import EmailMessage

from app.core.config import settings

logger = logging.getLogger(__name__)


def _send_message(message: EmailMessage) -> bool:
    if not settings.SMTP_HOST or not settings.EMAIL_USER or not settings.EMAIL_PASSWORD:
        logger.warning("SMTP no configurado; no se pudo enviar el correo.")
        return False
    try:
        context = ssl.create_default_context()
        if settings.SMTP_USE_SSL:
            with smtplib.SMTP_SSL(settings.SMTP_HOST, settings.SMTP_PORT, context=context) as server:
                server.login(settings.EMAIL_USER, settings.EMAIL_PASSWORD)
                server.send_message(message)
        else:
            with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
                server.ehlo()
                if settings.SMTP_USE_TLS:
                    server.starttls(context=context)
                    server.ehlo()
                server.login(settings.EMAIL_USER, settings.EMAIL_PASSWORD)
                server.send_message(message)
        return True
    except (OSError, smtplib.SMTPException) as exc:
        logger.exception("No se pudo enviar el correo: %s", exc)
        return False


def send_email_verification_code(recipient: str, code: str, purpose: str, expires_minutes: int) -> bool:
    subject = "Tu código de acceso Cloud Diagnostix AWS" if purpose == "login" else "Código para recuperar tu contraseña"
    message = EmailMessage()
    message["Subject"] = subject
    message["From"] = settings.EMAIL_FROM or settings.EMAIL_USER
    message["To"] = recipient
    message.set_content(
        "Hola,\n\n"
        f"Tu código de verificación es: {code}\n\n"
        f"Este código vence en {expires_minutes} minutos y solo puede utilizarse una vez.\n"
        "Si no solicitaste esta operación, ignora este correo.\n\n"
        "Cloud Diagnostix AWS"
    )
    return _send_message(message)


def send_password_reset_email(recipient: str, reset_url: str, expires_minutes: int, code: str) -> bool:
    """Envía el enlace de recuperación; devuelve False si SMTP no está configurado."""
    message = EmailMessage()
    message["Subject"] = "Recupera tu contraseña de Cloud Diagnostix AWS"
    message["From"] = settings.EMAIL_FROM or settings.EMAIL_USER
    message["To"] = recipient
    message.set_content(
        "Hola,\n\n"
        "Recibimos una solicitud para cambiar la contraseña de tu cuenta Cloud Diagnostix AWS.\n\n"
        f"Abre este enlace dentro de los próximos {expires_minutes} minutos:\n{reset_url}\n\n"
        f"Después ingresa este código de 6 dígitos: {code}\n\n"
        "El enlace es de un solo uso. Si no solicitaste este cambio, ignora este mensaje.\n\n"
        "Cloud Diagnostix AWS"
    )

    return _send_message(message)
