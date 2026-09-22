"""
Modelos ORM de Postulaciones Service.

Igual que Matching Service, este servicio lee directamente perfiles_adoptante,
refugios y mascotas (justificado por la misma razón documentada de BD
compartida). Es DUEÑO de la tabla postulaciones (la escribe).

usuarios y matches también se leen aquí en modo SOLO LECTURA: el refugio
necesita ver el nombre del postulante y su score de compatibilidad al
evaluar una solicitud (CU05 y RN04 del documento de requisitos).
"""
from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, Numeric, String
from sqlalchemy.sql import func

from database import Base


class Usuario(Base):
    __tablename__ = "usuarios"

    id = Column(Integer, primary_key=True)
    nombre = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False)


class PerfilAdoptante(Base):
    __tablename__ = "perfiles_adoptante"

    id = Column(Integer, primary_key=True)
    usuario_id = Column(Integer, unique=True, nullable=False)
    espacio_disponible = Column(String)
    tiempo_disponible_horas_dia = Column(Integer)
    experiencia_previa = Column(String)
    tiene_ninos = Column(Boolean, default=False)
    otras_mascotas = Column(Boolean, default=False)
    nivel_actividad_fisica = Column(String)


class Match(Base):
    __tablename__ = "matches"

    id = Column(Integer, primary_key=True)
    adoptante_id = Column(Integer, nullable=False)
    mascota_id = Column(Integer, nullable=False)
    score_compatibilidad = Column(Numeric(4, 3))


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