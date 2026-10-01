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
from sqlalchemy.dialects.postgresql import ARRAY, JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from database import Base


class PerfilAdoptante(Base):
    __tablename__ = "perfiles_adoptante"

    id = Column(Integer, primary_key=True)
    usuario_id = Column(Integer, unique=True, nullable=False)
    espacio_disponible = Column(String)
    restriccion_vivienda = Column(String)
    horas_sola = Column(String)
    tiempo_actividad = Column(String)
    experiencia_previa = Column(String)
    ambiente_hogar = Column(String)
    ninos_hogar = Column(String)
    tiene_perros = Column(Boolean, default=False)
    tiene_gatos = Column(Boolean, default=False)
    alergias = Column(String)
    acepta_cuidados = Column(String)
    especie_preferida = Column(String)  # Perro | Gato | NULL = sin preferencia
    tamanos_preferidos = Column(ARRAY(String))
    etapas_preferidas = Column(ARRAY(String))
    sexo_preferido = Column(String)


class Mascota(Base):
    __tablename__ = "mascotas"

    id = Column(Integer, primary_key=True)
    refugio_id = Column(Integer, nullable=False)
    nombre = Column(String, nullable=False)
    especie = Column(String, nullable=False)
    raza = Column(String)
    edad = Column(Integer, nullable=False)
    sexo = Column(String, nullable=False)
    tamano = Column(String)  # solo perros
    nivel_energia = Column(String, nullable=False)
    tolerancia_soledad = Column(String, nullable=False)
    temperamento = Column(String, nullable=False)
    convivencia_ninos = Column(String)  # NULL = no evaluado
    convive_perros = Column(Boolean)
    convive_gatos = Column(Boolean)
    nivel_experiencia_requerida = Column(String, nullable=False)
    espacio_minimo_requerido = Column(String, nullable=False)
    nivel_cuidados = Column(String, nullable=False)
    estado = Column(String, nullable=False, default="disponible")
    fecha_publicacion = Column(DateTime, server_default=func.now())

    fotos = relationship("FotoMascota", back_populates="mascota")


class FotoMascota(Base):
    __tablename__ = "fotos_mascota"

    id = Column(Integer, primary_key=True)
    mascota_id = Column(Integer, ForeignKey("mascotas.id"), nullable=False)
    url = Column(String, nullable=False)
    es_principal = Column(Boolean, nullable=False, default=False)
    orden = Column(Integer)

    mascota = relationship("Mascota", back_populates="fotos")


class Match(Base):
    __tablename__ = "matches"

    id = Column(Integer, primary_key=True)
    adoptante_id = Column(Integer, ForeignKey("perfiles_adoptante.id"), nullable=False)
    mascota_id = Column(Integer, ForeignKey("mascotas.id"), nullable=False)
    score_compatibilidad = Column(Numeric(4, 3))
    desglose = Column(JSONB)  # Evaluacion.a_json() de scoring.py
    fecha_calculo = Column(DateTime, server_default=func.now())