"""
Esquemas Pydantic. Los Literal de aquí deben mantenerse en sincronía con los
CHECK constraints de la base de datos (BD_HouseFound_v2.sql) — ver la
recomendación de "registro centralizado de valores válidos" del equipo.
"""
from datetime import datetime
from typing import List, Literal, Optional

from pydantic import BaseModel, field_validator, model_validator

Especie = Literal["Perro", "Gato"]
Sexo = Literal["macho", "hembra"]
Tamano = Literal["pequeno", "mediano", "grande"]
Nivel = Literal["bajo", "medio", "alto"]
Espacio = Literal["departamento", "casa_patio", "casa_grande"]
ToleranciaSoledad = Literal["menos_2h", "2_4h", "4_8h", "mas_8h"]
Temperamento = Literal["sociable", "reservado", "timido"]
ConvivenciaNinos = Literal["todos", "mayores", "no"]
NivelCuidados = Literal["ninguno", "leves", "complejos"]
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
    especie: Especie
    raza: Optional[str] = None
    # Edad aproximada en años (0 = menos de 1 año).
    edad: int
    sexo: Sexo
    # Tamaño adulto estimado: obligatorio en perros, no aplica a gatos.
    tamano: Optional[Tamano] = None
    # Cuestionario de compatibilidad: cada respuesta se compara con su par del
    # adoptante (ver backend/matching-service/scoring.py).
    espacio_minimo_requerido: Espacio
    # Horas seguidas que puede quedarse sola tranquila.
    tolerancia_soledad: ToleranciaSoledad
    # Actividad diaria que necesita.
    nivel_energia: Nivel
    nivel_experiencia_requerida: Nivel
    temperamento: Temperamento
    # None = el refugio aún no lo ha evaluado: nunca excluye, genera una alerta.
    convivencia_ninos: Optional[ConvivenciaNinos] = None
    convive_perros: Optional[bool] = None
    convive_gatos: Optional[bool] = None
    nivel_cuidados: NivelCuidados
    # Descripción de los cuidados; obligatoria si nivel_cuidados no es "ninguno".
    cuidados_especiales: Optional[str] = None
    # Ficha de salud: informativa, no puntúa (None = sin información).
    esterilizado: Optional[bool] = None
    vacunas_al_dia: Optional[bool] = None
    desparasitado: Optional[bool] = None
    microchip: Optional[bool] = None
    notas_salud: Optional[str] = None

    @field_validator("edad")
    @classmethod
    def validar_edad(cls, v: int) -> int:
        if v < 0:
            raise ValueError("edad no puede ser negativa")
        return v

    @field_validator("cuidados_especiales", "notas_salud")
    @classmethod
    def texto_vacio_a_none(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        return v.strip() or None

    @model_validator(mode="after")
    def validar_coherencia(self):
        if self.especie == "Perro" and self.tamano is None:
            raise ValueError("Indica el tamaño adulto estimado del perro")
        if self.especie == "Gato":
            self.tamano = None
        if self.nivel_cuidados == "ninguno":
            self.cuidados_especiales = None
        elif not self.cuidados_especiales:
            raise ValueError("Describe los cuidados especiales que necesita")
        return self


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