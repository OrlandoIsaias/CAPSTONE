"""
Validación de RUT chileno (dígito verificador por módulo 11).
"""
import re

_REGEX_RUT = re.compile(r"^(\d{1,8})-?([\dkK])$")


def calcular_dv(numero: int) -> str:
    suma, multiplicador = 0, 2
    for digito in reversed(str(numero)):
        suma += int(digito) * multiplicador
        multiplicador = 2 if multiplicador == 7 else multiplicador + 1
    resto = 11 - suma % 11
    if resto == 11:
        return "0"
    if resto == 10:
        return "K"
    return str(resto)


def parsear_rut(texto: str) -> tuple[int, str]:
    """Acepta '12.345.678-5', '12345678-5' o '123456785'. Devuelve (numero, dv)
    o lanza ValueError si el formato o el dígito verificador no son válidos."""
    limpio = texto.replace(".", "").replace(" ", "").strip()
    coincidencia = _REGEX_RUT.match(limpio)
    if not coincidencia:
        raise ValueError("Formato de RUT inválido")
    numero, dv = int(coincidencia.group(1)), coincidencia.group(2).upper()
    if numero <= 0 or calcular_dv(numero) != dv:
        raise ValueError("RUT inválido: el dígito verificador no corresponde")
    return numero, dv


def formatear_rut(numero: int, dv: str) -> str:
    return f"{numero:,}".replace(",", ".") + f"-{dv}"
