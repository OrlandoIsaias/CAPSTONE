"""
Modelos ORM de Matching Service.

A diferencia de Mascotas Service (que NUNCA toca la tabla refugios y en su
lugar llama a Auth Service por HTTP), Matching Service SÍ lee directamente
perfiles_adoptante y mascotas — esta es precisamente la razón documentada
para usar una base de datos compartida: "el futuro modelo de Machine
Learning necesita cruzar datos de varias tablas... sin requerir procesos
adicionales de integración" (síntesis del proyecto, sección Arquitectura).

Matching Service es DUEÑO de la tabla matches (la escribe); las otras dos
las trata como solo lectura.
"""
from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, Numeric, String
from sqlalchemy.sql import func

from database import Base


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


class Mascota(Base):
    __tablename__ = "mascotas"

    id = Column(Integer, primary_key=True)
    refugio_id = Column(Integer, nullable=False)
    nombre = Column(String, nullable=False)
    especie = Column(String)
    raza = Column(String)
    edad = Column(Integer)
    nivel_energia = Column(String)
    nivel_socializacion = Column(String)
    compatible_ninos = Column(Boolean)
    compatible_otras_mascotas = Column(Boolean)
    nivel_experiencia_requerida = Column(String)
    espacio_minimo_requerido = Column(String)
    estado = Column(String, nullable=False, default="disponible")
    fecha_publicacion = Column(DateTime, server_default=func.now())


class Match(Base):
    __tablename__ = "matches"

    id = Column(Integer, primary_key=True)
    adoptante_id = Column(Integer, ForeignKey("perfiles_adoptante.id"), nullable=False)
    mascota_id = Column(Integer, ForeignKey("mascotas.id"), nullable=False)
    score_compatibilidad = Column(Numeric(4, 3))
    fecha_calculo = Column(DateTime, server_default=func.now())