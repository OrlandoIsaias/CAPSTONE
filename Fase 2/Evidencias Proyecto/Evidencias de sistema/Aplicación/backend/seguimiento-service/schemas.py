from datetime import datetime
from typing import List, Literal, Optional

from pydantic import BaseModel, Field, model_validator


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


# ---------- Chat de seguimiento ----------

TipoMensaje = Literal["texto", "imagen", "audio", "video", "encuesta"]


class MensajeCrear(BaseModel):
    # 'encuesta' no se envía a mano: la crea POST /seguimientos.
    tipo: Literal["texto", "imagen", "audio", "video"]
    texto: Optional[str] = Field(default=None, max_length=2000)
    media_public_id: Optional[str] = Field(default=None, max_length=255)
    duracion_seg: Optional[float] = Field(default=None, ge=0, le=9999)

    @model_validator(mode="after")
    def validar_contenido(self):
        self.texto = self.texto.strip() if self.texto else None
        if self.tipo == "texto":
            if not self.texto:
                raise ValueError("El mensaje está vacío")
            if self.media_public_id:
                raise ValueError("Un mensaje de texto no lleva archivo")
        elif not self.media_public_id:
            raise ValueError(f"Un mensaje de tipo '{self.tipo}' necesita su archivo")
        return self


class MensajeOut(BaseModel):
    id: int
    postulacion_id: int
    autor_rol: Literal["adoptante", "refugio"]
    es_mio: bool
    tipo: TipoMensaje
    texto: Optional[str] = None
    media_url: Optional[str] = None
    media_miniatura_url: Optional[str] = None
    duracion_seg: Optional[float] = None
    creado_en: datetime
    leido_en: Optional[datetime] = None


class UltimoMensaje(BaseModel):
    tipo: TipoMensaje
    texto: Optional[str] = None
    es_mio: bool
    creado_en: datetime


class EncuestaEstado(BaseModel):
    dias: Literal[30, 90]
    # respondida | disponible (el adoptante ya puede responderla) |
    # pendiente (aún no se cumple el plazo o no se confirma la adopción)
    estado: Literal["respondida", "disponible", "pendiente"]
    disponible_desde: Optional[datetime] = None
    resultado: Optional[str] = None


class ChatResumen(BaseModel):
    postulacion_id: int
    mascota_id: int
    mascota_nombre: str
    mascota_foto: Optional[str] = None
    mascota_estado: str
    contraparte_nombre: str
    fecha_adopcion: Optional[datetime] = None
    ultimo_mensaje: Optional[UltimoMensaje] = None
    no_leidos: int
    # Solo para el adoptante: hay una encuesta que ya puede responder.
    encuesta_disponible: bool = False


class ChatDetalle(ChatResumen):
    mi_rol: Literal["adoptante", "refugio"]
    encuestas: List[EncuestaEstado]


class NoLeidosOut(BaseModel):
    total: int


class FirmaSubidaOut(BaseModel):
    cloud_name: str
    api_key: str
    timestamp: int
    folder: str
    signature: str
