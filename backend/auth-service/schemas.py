from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, EmailStr, field_validator


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

    @field_validator("tiempo_disponible_horas_dia")
    @classmethod
    def validar_horas(cls, v: int) -> int:
        if not (0 <= v <= 24):
            raise ValueError("tiempo_disponible_horas_dia debe estar entre 0 y 24")
        return v


class PerfilAdoptanteOut(PerfilAdoptanteIn):
    id: int
    usuario_id: int

    class Config:
        from_attributes = True


class PerfilRefugioIn(BaseModel):
    nombre_refugio: str
    direccion: Optional[str] = None
    telefono_contacto: Optional[str] = None


class PerfilRefugioOut(PerfilRefugioIn):
    id: int
    usuario_id: int

    class Config:
        from_attributes = True