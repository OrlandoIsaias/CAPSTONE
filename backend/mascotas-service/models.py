"""
Modelos ORM. Mascotas Service solo conoce Mascota y FotoMascota — por diseño
de arquitectura, NUNCA mapea ni consulta directamente la tabla refugios,
aunque técnicamente esté en la misma base de datos física. Cuando necesita
saber el refugio_id del usuario autenticado, se lo pregunta a Auth Service
por HTTP (ver clients.py).
"""
from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from database import Base


class Mascota(Base):
    __tablename__ = "mascotas"

    id = Column(Integer, primary_key=True)
    refugio_id = Column(Integer, nullable=False)  # FK física a refugios.id (definida en el SQL, no aquí)
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

    fotos = relationship("FotoMascota", back_populates="mascota", cascade="all, delete-orphan")


class FotoMascota(Base):
    __tablename__ = "fotos_mascota"

    id = Column(Integer, primary_key=True)
    mascota_id = Column(Integer, ForeignKey("mascotas.id"), nullable=False)
    url = Column(String, nullable=False)
    es_principal = Column(Boolean, nullable=False, default=False)
    orden = Column(Integer)

    mascota = relationship("Mascota", back_populates="fotos")