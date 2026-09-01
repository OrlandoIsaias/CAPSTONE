"""
Modelos ORM de Postulaciones Service.

Igual que Matching Service, este servicio lee directamente perfiles_adoptante,
refugios y mascotas (justificado por la misma razón documentada de BD
compartida). Es DUEÑO de la tabla postulaciones (la escribe).
"""
from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.sql import func

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
    raza = Column(String)
    estado = Column(String, nullable=False, default="disponible")


class Postulacion(Base):
    __tablename__ = "postulaciones"

    id = Column(Integer, primary_key=True)
    adoptante_id = Column(Integer, ForeignKey("perfiles_adoptante.id"), nullable=False)
    mascota_id = Column(Integer, ForeignKey("mascotas.id"), nullable=False)
    estado = Column(String, nullable=False, default="pendiente")
    fecha_postulacion = Column(DateTime, server_default=func.now())