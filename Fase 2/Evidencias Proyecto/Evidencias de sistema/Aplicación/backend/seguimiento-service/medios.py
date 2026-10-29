"""
Archivos del chat de seguimiento (fotos, audios y videos) en Cloudinary.

El navegador sube el archivo DIRECTO a Cloudinary con una firma que entrega
este servicio: un video de 50 MB no pasa por el gateway ni por este servicio
(en Render chocaría con los tiempos de espera). La firma fija la carpeta
housefound/seguimiento/<postulacion_id>, así que al registrar el mensaje basta
con verificar que el public_id esté dentro de esa carpeta.

Las URLs se arman aquí a partir del public_id (nunca se guarda una URL que
mande el cliente) y piden a Cloudinary formatos que reproduce cualquier
celular: mp4 para video y mp3 para audio, aunque se hayan grabado en webm.
"""
import hashlib
import os
import time
from typing import Optional

from dotenv import load_dotenv

load_dotenv()

CLOUD_NAME = os.getenv("CLOUDINARY_CLOUD_NAME")
API_KEY = os.getenv("CLOUDINARY_API_KEY")
API_SECRET = os.getenv("CLOUDINARY_API_SECRET")

BASE_ENTREGA = f"https://res.cloudinary.com/{CLOUD_NAME}"


def configurado() -> bool:
    return bool(CLOUD_NAME and API_KEY and API_SECRET)


def carpeta_de(postulacion_id: int) -> str:
    return f"housefound/seguimiento/{postulacion_id}"


def firmar_subida(postulacion_id: int) -> dict:
    """Parámetros firmados para POST https://api.cloudinary.com/v1_1/<cloud>/<image|video>/upload.
    Cloudinary rechaza la firma pasada una hora."""
    parametros = {"folder": carpeta_de(postulacion_id), "timestamp": int(time.time())}
    # Firma de Cloudinary: SHA-1 de los parámetros ordenados "k=v&k=v" + api_secret.
    a_firmar = "&".join(f"{k}={parametros[k]}" for k in sorted(parametros))
    firma = hashlib.sha1(f"{a_firmar}{API_SECRET}".encode("utf-8")).hexdigest()
    return {
        **parametros,
        "signature": firma,
        "api_key": API_KEY,
        "cloud_name": CLOUD_NAME,
    }


def pertenece_al_chat(public_id: str, postulacion_id: int) -> bool:
    prefijo = carpeta_de(postulacion_id) + "/"
    resto = public_id[len(prefijo):] if public_id.startswith(prefijo) else ""
    # Sin subcarpetas ni "..": el archivo está directo en la carpeta del chat.
    return bool(resto) and "/" not in resto and ".." not in resto


def url_de(tipo: str, public_id: Optional[str]) -> Optional[str]:
    if not public_id:
        return None
    if tipo == "imagen":
        return f"{BASE_ENTREGA}/image/upload/c_limit,w_1280/q_auto/f_auto/{public_id}"
    if tipo == "video":
        return f"{BASE_ENTREGA}/video/upload/c_limit,w_720/q_auto/{public_id}.mp4"
    if tipo == "audio":
        # Cloudinary guarda el audio como recurso "video" y lo convierte a mp3.
        return f"{BASE_ENTREGA}/video/upload/{public_id}.mp3"
    return None


def miniatura_de(tipo: str, public_id: Optional[str]) -> Optional[str]:
    """Primer cuadro del video, para mostrarlo antes de reproducir."""
    if tipo != "video" or not public_id:
        return None
    return f"{BASE_ENTREGA}/video/upload/so_0,c_limit,w_720/q_auto/{public_id}.jpg"
