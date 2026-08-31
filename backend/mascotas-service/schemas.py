"""
Esquemas Pydantic. Los Literal de aquí deben mantenerse en sincronía con los
CHECK constraints de la base de datos (BD_HouseFound_v2.sql) — ver la
recomendación de "registro centralizado de valores válidos" del equipo.
"""
from datetime import datetime
from typing import List, Literal, Optional

from pydantic import BaseModel, field_validator

Nivel = Literal["bajo", "medio", "alto"]
Espacio = Literal["departamento", "casa_patio", "casa_grande"]
EstadoMascota = Literal["disponible", "en_proceso", "adoptada"]


class FotoMascotaIn(BaseModel):
    url: str
    es_principal: bool = False
    orden: Optional[int] = None

    @field_validator("orden")
    @classmethod
    def validar_orden(cls, v: Optional[int]) -> Optional[int]:
        if v is not None and v < 0:
            raise ValueError("orden no puede ser negativo")
        return v


class FotoMascotaOut(FotoMascotaIn):
    id: int
    mascota_id: int

    class Config:
        from_attributes = True


class MascotaIn(BaseModel):
    nombre: str
    especie: Optional[str] = None
    raza: Optional[str] = None
    edad: Optional[int] = None
    nivel_energia: Nivel
    nivel_socializacion: Nivel
    compatible_ninos: Optional[bool] = None
    compatible_otras_mascotas: Optional[bool] = None
    nivel_experiencia_requerida: Nivel
    espacio_minimo_requerido: Espacio

    @field_validator("edad")
    @classmethod
    def validar_edad(cls, v: Optional[int]) -> Optional[int]:
        if v is not None and v < 0:
            raise ValueError("edad no puede ser negativa")
        return v


class MascotaOut(MascotaIn):
    id: int
    refugio_id: int
    estado: EstadoMascota
    fecha_publicacion: datetime
    fotos: List[FotoMascotaOut] = []

    class Config:
        from_attributes = True


class MascotaEstadoIn(BaseModel):
    estado: EstadoMascota