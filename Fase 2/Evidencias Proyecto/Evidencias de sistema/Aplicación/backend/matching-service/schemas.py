from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class RecomendacionOut(BaseModel):
    mascota_id: int
    nombre: str
    especie: Optional[str] = None
    raza: Optional[str] = None
    estado: str
    score_compatibilidad: float
    fecha_calculo: datetime

    class Config:
        from_attributes = True