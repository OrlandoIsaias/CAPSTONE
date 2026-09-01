from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, field_validator, model_validator


class SeguimientoCrear(BaseModel):
    postulacion_id: int
    dias_transcurridos: Literal[30, 90]
    resultado: Literal["exitosa", "devuelta", "en_proceso"]
    motivo_devolucion: Optional[str] = None

    @model_validator(mode="after")
    def validar_motivo_si_devuelta(self):
        if self.resultado == "devuelta" and not (self.motivo_devolucion and self.motivo_devolucion.strip()):
            raise ValueError("motivo_devolucion es obligatorio cuando resultado='devuelta'")
        return self


class SeguimientoOut(BaseModel):
    id: int
    postulacion_id: int
    mascota_id: int
    mascota_nombre: str
    dias_transcurridos: int
    resultado: Optional[str] = None
    motivo_devolucion: Optional[str] = None
    fecha_respuesta: datetime

    class Config:
        from_attributes = True


class MetricasOut(BaseModel):
    total_seguimientos: int
    exitosas: int
    devueltas: int
    en_proceso: int
    tasa_devolucion: Optional[float] = None  # devueltas / (exitosas + devueltas), None si no hay datos concluyentes