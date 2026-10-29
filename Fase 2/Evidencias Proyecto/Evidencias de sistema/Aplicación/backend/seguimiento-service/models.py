"""
Modelos ORM de Seguimiento Service.

Lee directamente usuarios, perfiles_adoptante, refugios, mascotas,
fotos_mascota y postulaciones (misma justificación de BD compartida usada en
Matching y Postulaciones Service). Es DUEÑO de seguimientos_post_adopcion y
de mensajes_seguimiento (el chat adoptante-refugio, migración 007).
"""
from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.sql import func

from database import Base


class Usuario(Base):
    __tablename__ = "usuarios"

    id = Column(Integer, primary_key=True)
    nombre = Column(String, nullable=False)


class PerfilAdoptante(Base):
    __tablename__ = "perfiles_adoptante"

    id = Column(Integer, primary_key=True)
    usuario_id = Column(Integer, unique=True, nullable=False)


class Refugio(Base):
    __tablename__ = "refugios"

    id = Column(Integer, primary_key=True)
    usuario_id = Column(Integer, unique=True, nullable=False)
    nombre_refugio = Column(String)


class Mascota(Base):
    __tablename__ = "mascotas"

    id = Column(Integer, primary_key=True)
    refugio_id = Column(Integer, nullable=False)
    nombre = Column(String, nullable=False)
    especie = Column(String)
    estado = Column(String, nullable=False, default="disponible")


class FotoMascota(Base):
    __tablename__ = "fotos_mascota"

    id = Column(Integer, primary_key=True)
    mascota_id = Column(Integer, nullable=False)
    url = Column(String, nullable=False)
    es_principal = Column(Boolean, nullable=False, default=False)
    orden = Column(Integer)


class Postulacion(Base):
    __tablename__ = "postulaciones"

    id = Column(Integer, primary_key=True)
    adoptante_id = Column(Integer, nullable=False)
    mascota_id = Column(Integer, nullable=False)
    estado = Column(String, nullable=False, default="pendiente")
    fecha_adopcion = Column(DateTime)


class SeguimientoPostAdopcion(Base):
    __tablename__ = "seguimientos_post_adopcion"

    id = Column(Integer, primary_key=True)
    postulacion_id = Column(Integer, ForeignKey("postulaciones.id"), nullable=False)
    dias_transcurridos = Column(Integer, nullable=False)
    resultado = Column(String)
    motivo_devolucion = Column(Text)
    fecha_respuesta = Column(DateTime)


class MensajeSeguimiento(Base):
    __tablename__ = "mensajes_seguimiento"

    id = Column(Integer, primary_key=True)
    postulacion_id = Column(Integer, ForeignKey("postulaciones.id"), nullable=False)
    autor_usuario_id = Column(Integer, nullable=False)
    autor_rol = Column(String, nullable=False)
    tipo = Column(String, nullable=False)
    texto = Column(Text)
    media_public_id = Column(String)
    duracion_seg = Column(Numeric(6, 1))
    creado_en = Column(DateTime, nullable=False, server_default=func.now())
    leido_en = Column(DateTime)
