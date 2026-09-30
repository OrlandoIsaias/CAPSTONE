from sqlalchemy import Column, Integer, String, Boolean, Date, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from database import Base


class Usuario(Base):
    __tablename__ = "usuarios"

    id = Column(Integer, primary_key=True)
    nombre = Column(String, nullable=False)
    # NULL solo en refugios: inician sesión con RUT + código y su correo vive
    # en organizaciones_validadas (CHECK chk_usuarios_credenciales_adoptante).
    email = Column(String, unique=True)
    password_hash = Column(String)
    rol = Column(String, nullable=False)
    estado = Column(String, nullable=False, default="activo")
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
    organizacion_id = Column(Integer, ForeignKey("organizaciones_validadas.id"), unique=True, nullable=False)

    usuario = relationship("Usuario", back_populates="refugio")
    organizacion = relationship("OrganizacionValidada")


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
    telefono = Column(String)
    foto_perfil = Column(String)  # URL de Cloudinary; nullable, la columna ya existe en la BD

    usuario = relationship("Usuario", back_populates="perfil_adoptante")


class OrganizacionValidada(Base):
    __tablename__ = "organizaciones_validadas"

    id = Column(Integer, primary_key=True)
    rut = Column(Integer, unique=True, nullable=False)
    dv = Column(String(1), nullable=False)
    razon_social = Column(String, nullable=False)
    actividad = Column(Text)
    unidad_sii = Column(String)
    direccion = Column(String)
    comuna = Column(String)
    region = Column(String)
    fecha_inscripcion = Column(Date)
    correo = Column(String)
    es_prueba = Column(Boolean, nullable=False, default=False)
    fecha_carga = Column(DateTime, server_default=func.now())
    fecha_actualizacion = Column(DateTime, server_default=func.now())


class CodigoVerificacion(Base):
    __tablename__ = "codigos_verificacion"

    id = Column(Integer, primary_key=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id", ondelete="CASCADE"), nullable=False)
    codigo_hash = Column(String, nullable=False)
    expira_en = Column(DateTime, nullable=False)
    intentos = Column(Integer, nullable=False, default=0)
    usado = Column(Boolean, nullable=False, default=False)
    creado_en = Column(DateTime, server_default=func.now())