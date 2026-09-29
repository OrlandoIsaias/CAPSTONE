"""
Rate limiting de intentos de login — en memoria, por email.

No hay Redis ni otra infraestructura compartida en este proyecto, y
auth-service corre un solo proceso (un worker de uvicorn, ver Dockerfile),
así que un diccionario en memoria es correcto y suficiente: no hace falta
coordinar estado entre procesos porque no hay más de uno.

Se rastrea por email (no por IP): lo que se protege es la cuenta en sí,
sin importar desde qué IP venga el ataque — un atacante con varias IPs no
gana nada intentando distinto origen contra el mismo correo.
"""
from datetime import datetime, timedelta

MAX_INTENTOS = 5
VENTANA_BLOQUEO = timedelta(minutes=15)

_intentos_fallidos: dict[str, int] = {}
_bloqueado_hasta: dict[str, datetime] = {}


def tiempo_bloqueo_restante(email: str) -> timedelta | None:
    """None si no está bloqueado; si lo está, cuánto falta para que se libere."""
    vence = _bloqueado_hasta.get(email)
    if vence is None:
        return None
    restante = vence - datetime.utcnow()
    if restante.total_seconds() <= 0:
        # El bloqueo ya expiró — se limpia para no dejar memoria acumulada
        # de cuentas que ya no están bloqueadas.
        _bloqueado_hasta.pop(email, None)
        _intentos_fallidos.pop(email, None)
        return None
    return restante


def registrar_intento_fallido(email: str) -> None:
    intentos = _intentos_fallidos.get(email, 0) + 1
    _intentos_fallidos[email] = intentos
    if intentos >= MAX_INTENTOS:
        _bloqueado_hasta[email] = datetime.utcnow() + VENTANA_BLOQUEO


def limpiar_intentos(email: str) -> None:
    """Se llama tras un login exitoso — una cuenta que sí pudo entrar no
    debe arrastrar intentos fallidos previos."""
    _intentos_fallidos.pop(email, None)
    _bloqueado_hasta.pop(email, None)
