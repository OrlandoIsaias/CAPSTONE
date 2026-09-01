"""
Modelos ORM de Seguimiento Service.

Lee directamente perfiles_adoptante, refugios, mascotas y postulaciones
(misma justificación de BD compartida usada en Matching y Postulaciones
Service). Es DUEÑO de seguimientos_post_adopcion.
"""
from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text

from database import Base


class PerfilAdoptante(Base):
    __tablename__ = "perfiles_adoptante"

    id = Column(Integer, primary_key=True)
    usuario_id = Column(Integer, unique=True, nullable=False)


class Refugio(Base):
    __tablename__ = "refugios"

    id = Column(Integer, primary_key=True)
    usuario_id = Column(Integer, unique=True, nullable=False)


class Mascota(Base):
    __tablename__ = "mascotas"

    id = Column(Integer, primary_key=True)
    refugio_id = Column(Integer, nullable=False)
    nombre = Column(String, nullable=False)
    especie = Column(String)
    estado = Column(String, nullable=False, default="disponible")


class Postulacion(Base):
    __tablename__ = "postulaciones"

    id = Column(Integer, primary_key=True)
    adoptante_id = Column(Integer, nullable=False)
    mascota_id = Column(Integer, nullable=False)
    estado = Column(String, nullable=False, default="pendiente")


class SeguimientoPostAdopcion(Base):
    __tablename__ = "seguimientos_post_adopcion"

    id = Column(Integer, primary_key=True)
    postulacion_id = Column(Integer, ForeignKey("postulaciones.id"), nullable=False)
    dias_transcurridos = Column(Integer, nullable=False)
    resultado = Column(String)
    motivo_devolucion = Column(Text)
    fecha_respuesta = Column(DateTime)