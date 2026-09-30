"""
Envío del código de verificación del login institucional.

Con MODO_DEV=true el código solo se escribe en los logs del contenedor
(docker compose logs auth-service) y no se envía ningún correo. En otro caso
se envía por SMTP (Gmail con contraseña de aplicación, Resend, Brevo, etc.).
"""
import logging
import os
import smtplib
from email.message import EmailMessage

logger = logging.getLogger("uvicorn.error")

MODO_DEV = os.getenv("MODO_DEV", "false").lower() == "true"
SMTP_HOST = os.getenv("SMTP_HOST")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")
SMTP_FROM = os.getenv("SMTP_FROM") or SMTP_USER


class ErrorEnvioCorreo(Exception):
    pass


def enmascarar(correo: str) -> str:
    usuario, _, dominio = correo.partition("@")
    return f"{usuario[:2]}****@{dominio}"


def enviar_codigo(destino: str, codigo: str, organizacion: str, minutos_validez: int) -> None:
    if MODO_DEV:
        logger.warning("[MODO_DEV] Código para %s (%s): %s", organizacion, destino, codigo)
        return

    if not (SMTP_HOST and SMTP_USER and SMTP_PASSWORD):
        raise ErrorEnvioCorreo("SMTP no configurado (SMTP_HOST, SMTP_USER, SMTP_PASSWORD)")

    mensaje = EmailMessage()
    mensaje["Subject"] = f"Tu código de acceso a HouseFound: {codigo}"
    mensaje["From"] = f"HouseFound <{SMTP_FROM}>"
    mensaje["To"] = destino
    mensaje.set_content(
        f"Hola, {organizacion}:\n\n"
        f"Tu código de acceso al panel de refugios de HouseFound es:\n\n"
        f"    {codigo}\n\n"
        f"Vence en {minutos_validez} minutos y solo puede usarse una vez.\n"
        f"Si no intentaste ingresar, ignora este correo.\n"
    )

    try:
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=15) as servidor:
            servidor.starttls()
            servidor.login(SMTP_USER, SMTP_PASSWORD)
            servidor.send_message(mensaje)
    except (smtplib.SMTPException, OSError) as e:
        logger.error("Fallo el envío del código a %s: %s", destino, e)
        raise ErrorEnvioCorreo(str(e)) from e
