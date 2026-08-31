"""
Llamadas a Auth Service. Mascotas Service NUNCA lee la tabla refugios
directamente (aunque comparta la misma base de datos física) — le pregunta
a Auth Service por su API REST, tal como está definido en la arquitectura
del proyecto. Esto mantiene la independencia real entre microservicios.
"""
import os

import httpx
from fastapi import HTTPException, status

AUTH_SERVICE_URL = os.getenv("AUTH_SERVICE_URL", "http://localhost:8000")


def obtener_refugio_id(token: str) -> int:
    """Consulta GET /auth/perfil-refugio en Auth Service, reenviando el
    mismo token del usuario, y devuelve el id real de su refugio."""
    try:
        respuesta = httpx.get(
            f"{AUTH_SERVICE_URL}/auth/perfil-refugio",
            headers={"Authorization": f"Bearer {token}"},
            timeout=5.0,
        )
    except httpx.RequestError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="No se pudo contactar a Auth Service para verificar el perfil de refugio",
        )

    if respuesta.status_code == 404:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Debes completar tu perfil de refugio (POST /auth/perfil-refugio) antes de publicar mascotas",
        )
    if respuesta.status_code != 200:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Respuesta inesperada de Auth Service al verificar el perfil de refugio",
        )

    return respuesta.json()["id"]