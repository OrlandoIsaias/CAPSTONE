from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel


class MotivoOut(BaseModel):
    codigo: str
    mensaje: str


class CriterioOut(BaseModel):
    criterio: str
    peso: float
    puntaje: float
    adoptante: str
    mascota: str


class RecomendacionOut(BaseModel):
    mascota_id: int
    nombre: str
    especie: str
    raza: Optional[str] = None
    edad: Optional[int] = None
    etapa: Optional[str] = None
    sexo: Optional[str] = None
    tamano: Optional[str] = None
    url_foto: Optional[str] = None
    estado: str
    score_compatibilidad: float
    fecha_calculo: datetime
    # Rasgos de la mascota, incluidos para que el frontend arme la
    # descripción corta sin tener que volver a pedir el listado de mascotas.
    nivel_energia: Optional[str] = None
    tolerancia_soledad: Optional[str] = None
    temperamento: Optional[str] = None
    convivencia_ninos: Optional[str] = None
    convive_perros: Optional[bool] = None
    convive_gatos: Optional[bool] = None
    nivel_cuidados: Optional[str] = None
    # False si no es de la especie que prefiere el adoptante (solo puede
    # ocurrir con ?explorar=true o en la ficha individual).
    coincide_preferencia: bool = True
    # Preferencias de orden que no cumple: "tamano", "etapa", "sexo".
    discrepancias_preferencias: List[str] = []
    # Capa de seguridad: una mascota excluida no aparece en Recomendaciones.
    excluida: bool = False
    motivos_exclusion: List[MotivoOut] = []
    alertas: List[MotivoOut] = []
    # Detalle del score: puntaje de cada criterio y si se aplicó el tope.
    desglose: List[CriterioOut] = []
    tope_aplicado: bool = False

    class Config:
        from_attributes = True
