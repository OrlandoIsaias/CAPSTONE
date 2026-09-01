from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel


class PostulacionCrear(BaseModel):
    mascota_id: int


class PostulacionOut(BaseModel):
    id: int
    adoptante_id: int
    mascota_id: int
    mascota_nombre: str
    mascota_especie: Optional[str] = None
    estado: str
    fecha_postulacion: datetime

    class Config:
        from_attributes = True


class PostulacionEstadoIn(BaseModel):
    estado: Literal["aprobada", "rechazada"]