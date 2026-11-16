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
    # Cuestionario (NULL hasta que el adoptante lo responde; valores en los
    # CHECK de la migración 006).
    espacio_disponible = Column(String)
    restriccion_vivienda = Column(String)
    horas_sola = Column(String)
    tiempo_actividad = Column(String)
    experiencia_previa = Column(String)
    ambiente_hogar = Column(String)
    ninos_hogar = Column(String)
    tiene_perros = Column(Boolean, nullable=False, default=False)
    tiene_gatos = Column(Boolean, nullable=False, default=False)
    alergias = Column(String)
    acepta_cuidados = Column(String)
    # Preferencias: NULL = me da igual.
    especie_preferida = Column(String)  # Perro | Gato
    sexo_preferido = Column(String)
    telefono = Column(String)
    foto_perfil = Column(String)  # URL de Cloudinary; nullable, la columna ya existe en la BD

    usuario = relationship("Usuario", back_populates="perfil_adoptante")
    # Tamaños y etapas preferidas viven en tablas puente (1FN: un valor por
    # fila). Sin filas = me da igual.
    _tamanos = relationship(
        "PerfilTamanoPreferido", cascade="all, delete-orphan", lazy="selectin"
    )
    _etapas = relationship(
        "PerfilEtapaPreferida", cascade="all, delete-orphan", lazy="selectin"
    )

    # Propiedades con la misma forma que las antiguas columnas de arreglo
    # (lista o None), para que la API y el frontend no cambien.
    @property
    def tamanos_preferidos(self):
        return [t.tamano for t in self._tamanos] or None

    @tamanos_preferidos.setter
    def tamanos_preferidos(self, valores):
        actuales = {t.tamano: t for t in self._tamanos}
        self._tamanos = [
            actuales.get(v) or PerfilTamanoPreferido(tamano=v) for v in dict.fromkeys(valores or [])
        ]

    @property
    def etapas_preferidas(self):
        return [e.etapa for e in self._etapas] or None

    @etapas_preferidas.setter
    def etapas_preferidas(self, valores):
        # Reutiliza las filas que ya existen: reemplazarlas por objetos nuevos
        # con la misma PK haría que el INSERT choque antes del DELETE.
        actuales = {e.etapa: e for e in self._etapas}
        self._etapas = [
            actuales.get(v) or PerfilEtapaPreferida(etapa=v) for v in dict.fromkeys(valores or [])
        ]


class PerfilTamanoPreferido(Base):
    __tablename__ = "perfil_tamano_preferido"

    perfil_id = Column(Integer, ForeignKey("perfiles_adoptante.id", ondelete="CASCADE"), primary_key=True)
    tamano = Column(String, primary_key=True)  # FK a tamanos(codigo) en la BD


class PerfilEtapaPreferida(Base):
    __tablename__ = "perfil_etapa_preferida"

    perfil_id = Column(Integer, ForeignKey("perfiles_adoptante.id", ondelete="CASCADE"), primary_key=True)
    etapa = Column(String, primary_key=True)  # FK a etapas_vida(codigo) en la BD


class Region(Base):
    __tablename__ = "regiones"

    id = Column(Integer, primary_key=True)
    nombre = Column(String, unique=True, nullable=False)


class Comuna(Base):
    __tablename__ = "comunas"

    id = Column(Integer, primary_key=True)
    nombre = Column(String, nullable=False)
    region_id = Column(Integer, ForeignKey("regiones.id"), nullable=False)


class OrganizacionValidada(Base):
    __tablename__ = "organizaciones_validadas"

    id = Column(Integer, primary_key=True)
    rut = Column(Integer, unique=True, nullable=False)
    dv = Column(String(1), nullable=False)
    razon_social = Column(String, nullable=False)
    actividad = Column(Text)
    direccion = Column(String)
    # 3FN: la región se obtiene por la comuna (comuna -> region).
    comuna_id = Column(Integer, ForeignKey("comunas.id"))
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