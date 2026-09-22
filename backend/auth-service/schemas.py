import re
from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, EmailStr, field_validator

# Celular chileno: acepta con o sin "+56", con o sin espacios
# (+56 9 1234 5678 / 56912345678 / 912345678, etc.). Se usa tanto para el
# teléfono del adoptante como el de contacto del refugio — ambos se comparten
# entre las partes recién cuando una postulación se aprueba, para coordinar
# la entrega (ver botón de WhatsApp en el frontend).
_REGEX_TELEFONO_CL = re.compile(r"^(?:\+?56)?\s*9\s*\d{4}\s*\d{4}$")


def _validar_y_normalizar_telefono(v: str) -> str:
    # Este validador SOLO debe usarse en los esquemas *In (al guardar). Los
    # esquemas *Out (al leer) no lo llevan a propósito: un perfil guardado
    # antes de que esta regla existiera —o con un valor que ya no calza con
    # el formato actual— debe poder seguir LEYÉNDOSE tal cual está en la
    # base de datos. Aplicar esta misma validación en la lectura fue justo
    # el bug que rompió "publicar mascota": el refugio tenía un teléfono
    # antiguo que no pasaba el regex, GET /auth/perfil-refugio explotaba con
    # 500, y mascotas-service (que depende de ese endpoint para resolver el
    # refugio_id) lo traducía en 502 hacia el frontend.
    if not _REGEX_TELEFONO_CL.match(v.strip()):
        raise ValueError(
            "Ingresa un celular chileno válido, ej: +56 9 1234 5678"
        )
    digitos = re.sub(r"\D", "", v)[-9:]  # últimos 9 dígitos: 9XXXXXXXX
    return f"+56 {digitos[0]} {digitos[1:5]} {digitos[5:]}"


class UsuarioRegistro(BaseModel):
    nombre: str
    email: EmailStr
    password: str
    rol: Literal["adoptante", "refugio"]

    @field_validator("email")
    @classmethod
    def normalizar_email(cls, v: str) -> str:
        return v.strip().lower()


class UsuarioLogin(BaseModel):
    email: EmailStr
    password: str

    @field_validator("email")
    @classmethod
    def normalizar_email(cls, v: str) -> str:
        return v.strip().lower()


class UsuarioOut(BaseModel):
    id: int
    nombre: str
    email: str
    rol: str
    fecha_registro: datetime

    class Config:
        from_attributes = True


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    usuario: UsuarioOut


class PerfilAdoptanteIn(BaseModel):
    espacio_disponible: Literal["departamento", "casa_patio", "casa_grande"]
    tiempo_disponible_horas_dia: int
    experiencia_previa: Literal["ninguna", "basica", "alta"]
    tiene_ninos: bool = False
    otras_mascotas: bool = False
    nivel_actividad_fisica: Literal["bajo", "medio", "alto"]
    telefono: str

    @field_validator("tiempo_disponible_horas_dia")
    @classmethod
    def validar_horas(cls, v: int) -> int:
        if not (0 <= v <= 24):
            raise ValueError("tiempo_disponible_horas_dia debe estar entre 0 y 24")
        return v

    @field_validator("telefono")
    @classmethod
    def validar_telefono(cls, v: str) -> str:
        return _validar_y_normalizar_telefono(v)


class PerfilAdoptanteOut(BaseModel):
    # No hereda de PerfilAdoptanteIn a propósito: no debe llevar su
    # field_validator de teléfono (ver el comentario en
    # _validar_y_normalizar_telefono). telefono es Optional acá porque
    # perfiles guardados antes de que este campo existiera —o con un valor
    # en un formato viejo— deben poder leerse tal cual, sin que
    # GET /auth/perfil-adoptante explote.
    id: int
    usuario_id: int
    espacio_disponible: Literal["departamento", "casa_patio", "casa_grande"]
    tiempo_disponible_horas_dia: int
    experiencia_previa: Literal["ninguna", "basica", "alta"]
    tiene_ninos: bool = False
    otras_mascotas: bool = False
    nivel_actividad_fisica: Literal["bajo", "medio", "alto"]
    telefono: Optional[str] = None

    class Config:
        from_attributes = True


class PerfilRefugioIn(BaseModel):
    nombre_refugio: str
    direccion: Optional[str] = None
    telefono_contacto: str

    @field_validator("nombre_refugio")
    @classmethod
    def validar_nombre(cls, v: str) -> str:
        if len(v.strip()) < 2:
            raise ValueError("Ingresa el nombre del refugio")
        return v.strip()

    @field_validator("telefono_contacto")
    @classmethod
    def validar_telefono(cls, v: str) -> str:
        return _validar_y_normalizar_telefono(v)


class PerfilRefugioOut(BaseModel):
    # No hereda de PerfilRefugioIn — mismo motivo que PerfilAdoptanteOut: la
    # lectura nunca debe aplicar la validación de guardado.
    id: int
    usuario_id: int
    nombre_refugio: str
    direccion: Optional[str] = None
    telefono_contacto: Optional[str] = None

    class Config:
        from_attributes = True