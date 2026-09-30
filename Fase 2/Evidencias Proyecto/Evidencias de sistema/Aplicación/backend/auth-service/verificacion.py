"""
Códigos de verificación del login institucional: 6 dígitos, un solo uso,
guardados como HMAC-SHA256 (nunca en texto plano).
"""
import hashlib
import hmac
import math
import os
import re
import secrets
from datetime import datetime, timedelta

from security import SECRET_KEY

# Código fijo para organizaciones con es_prueba = true: no se envía correo.
# Sin esta variable, las organizaciones de prueba siguen el flujo normal.
CODIGO_PRUEBA = os.getenv("CODIGO_PRUEBA") or None
if CODIGO_PRUEBA is not None and not re.fullmatch(r"\d{6}", CODIGO_PRUEBA):
    raise RuntimeError("CODIGO_PRUEBA debe tener exactamente 6 dígitos")

VALIDEZ = timedelta(minutes=10)
ESPERA_REENVIO = timedelta(seconds=60)
MAX_INTENTOS = 5
MAX_SOLICITUDES_POR_VENTANA = 5
VENTANA_SOLICITUDES = timedelta(hours=1)


def generar_codigo() -> str:
    return f"{secrets.randbelow(10**6):06d}"


def hashear_codigo(codigo: str) -> str:
    return hmac.new(SECRET_KEY.encode(), codigo.encode(), hashlib.sha256).hexdigest()


def codigo_coincide(codigo: str, codigo_hash: str) -> bool:
    return hmac.compare_digest(hashear_codigo(codigo), codigo_hash)


def segundos_para_reenviar(creado_en: datetime, ahora: datetime) -> int:
    restante = (creado_en + ESPERA_REENVIO - ahora).total_seconds()
    return math.ceil(restante) if restante > 0 else 0
