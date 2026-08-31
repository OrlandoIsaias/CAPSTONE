from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from database import Base


class Usuario(Base):
    __tablename__ = "usuarios"

    id = Column(Integer, primary_key=True)
    nombre = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False)
    password_hash = Column(String, nullable=False)
    rol = Column(String, nullable=False)
    fecha_registro = Column(DateTime, server_default=func.now())

    refugio = relationship("Refugio", back_populates="usuario", uselist=False)
    perfil_adoptante = relationship("PerfilAdoptante", back_populates="usuario", uselist=False)


class Refugio(Base):
    __tablename__ = "refugios"

    id = Column(Integer, primary_key=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), unique=True, nullable=False)
    nombre_refugio = Column(String, nullable=False)
    direccion = Column(String)
    telefono_contacto = Column(String)

    usuario = relationship("Usuario", back_populates="refugio")


class PerfilAdoptante(Base):
    __tablename__ = "perfiles_adoptante"

    id = Column(Integer, primary_key=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), unique=True, nullable=False)
    espacio_disponible = Column(String)
    tiempo_disponible_horas_dia = Column(Integer)
    experiencia_previa = Column(String)
    tiene_ninos = Column(Boolean, default=False)
    otras_mascotas = Column(Boolean, default=False)
    nivel_actividad_fisica = Column(String)

    usuario = relationship("Usuario", back_populates="perfil_adoptante")