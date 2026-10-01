"""
Modelos ORM. Mascotas Service solo conoce Mascota y FotoMascota — por diseño
de arquitectura, NUNCA mapea ni consulta directamente la tabla refugios,
aunque técnicamente esté en la misma base de datos física. Cuando necesita
saber el refugio_id del usuario autenticado, se lo pregunta a Auth Service
por HTTP (ver clients.py).
"""
from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from database import Base


class Mascota(Base):
    __tablename__ = "mascotas"

    id = Column(Integer, primary_key=True)
    refugio_id = Column(Integer, nullable=False)  # FK física a refugios.id (definida en el SQL, no aquí)
    nombre = Column(String, nullable=False)
    especie = Column(String, nullable=False)  # Perro | Gato (CHECK en la BD)
    raza = Column(String)
    edad = Column(Integer, nullable=False)
    sexo = Column(String, nullable=False)
    tamano = Column(String)  # tamaño adulto estimado; solo perros
    # Cuestionario de compatibilidad (valores en los CHECK de la migración 006).
    espacio_minimo_requerido = Column(String, nullable=False)
    tolerancia_soledad = Column(String, nullable=False)
    nivel_energia = Column(String, nullable=False)
    nivel_experiencia_requerida = Column(String, nullable=False)
    temperamento = Column(String, nullable=False)
    convivencia_ninos = Column(String)  # NULL = no evaluado
    convive_perros = Column(Boolean)
    convive_gatos = Column(Boolean)
    nivel_cuidados = Column(String, nullable=False)
    cuidados_especiales = Column(Text)
    # Ficha de salud: informativa, no puntúa (NULL = sin información).
    esterilizado = Column(Boolean)
    vacunas_al_dia = Column(Boolean)
    desparasitado = Column(Boolean)
    microchip = Column(Boolean)
    notas_salud = Column(Text)
    estado = Column(String, nullable=False, default="disponible")
    fecha_publicacion = Column(DateTime, server_default=func.now())
    origen = Column(String, nullable=False, default="manual")
    clave_seed = Column(String, unique=True)

    fotos = relationship("FotoMascota", back_populates="mascota", cascade="all, delete-orphan")


class FotoMascota(Base):
    __tablename__ = "fotos_mascota"

    id = Column(Integer, primary_key=True)
    mascota_id = Column(Integer, ForeignKey("mascotas.id"), nullable=False)
    url = Column(String, nullable=False)
    es_principal = Column(Boolean, nullable=False, default=False)
    orden = Column(Integer)

    mascota = relationship("Mascota", back_populates="fotos")