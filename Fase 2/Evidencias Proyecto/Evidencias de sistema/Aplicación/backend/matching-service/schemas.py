from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class RecomendacionOut(BaseModel):
    mascota_id: int
    nombre: str
    especie: Optional[str] = None
    raza: Optional[str] = None
    edad: Optional[int] = None
    url_foto: Optional[str] = None
    estado: str
    score_compatibilidad: float
    fecha_calculo: datetime
    # Rasgos de la mascota, incluidos para que el frontend arme la
    # descripción corta (descripcionCorta) sin tener que volver a pedir
    # el listado completo de mascotas.
    nivel_energia: Optional[str] = None
    nivel_socializacion: Optional[str] = None
    compatible_ninos: Optional[bool] = None
    compatible_otras_mascotas: Optional[bool] = None

    class Config:
        from_attributes = True