from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel


class PostulacionCrear(BaseModel):
    mascota_id: int


class PostulacionOut(BaseModel):
    id: int
    adoptante_id: int
    adoptante_nombre: Optional[str] = None
    mascota_id: int
    mascota_nombre: str
    mascota_especie: Optional[str] = None
    mascota_estado: str
    estado: str
    # Referencia para el refugio al evaluar (RN04): es apoyo a la decisión,
    # nunca un criterio de aceptación automática. None si el adoptante nunca
    # abrió la ficha de esa mascota y por lo tanto no hay match calculado.
    score_compatibilidad: Optional[float] = None
    fecha_postulacion: datetime
    # Datos de contacto para coordinar la entrega una vez aprobada la
    # postulación (botón de WhatsApp en el frontend). Pueden venir None si
    # la otra parte todavía no completa/actualiza su perfil con teléfono.
    adoptante_telefono: Optional[str] = None
    refugio_nombre: Optional[str] = None
    refugio_telefono: Optional[str] = None

    class Config:
        from_attributes = True


class PostulacionDetalleOut(PostulacionOut):
    """Ficha completa del postulante — es el cuestionario de estilo de vida
    que el adoptante respondió (CU01), que el refugio consulta para decidir."""

    espacio_disponible: Optional[str] = None
    tiempo_disponible_horas_dia: Optional[int] = None
    experiencia_previa: Optional[str] = None
    tiene_ninos: Optional[bool] = None
    otras_mascotas: Optional[bool] = None
    nivel_actividad_fisica: Optional[str] = None


class PostulacionEstadoIn(BaseModel):
    estado: Literal["aprobada", "rechazada"]