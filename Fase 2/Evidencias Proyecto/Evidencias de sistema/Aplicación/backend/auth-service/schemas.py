import re
from datetime import datetime
from typing import List, Literal, Optional

from pydantic import BaseModel, EmailStr, computed_field, field_validator, model_validator

from rut import parsear_rut

# Celular chileno: acepta con o sin "+56", con o sin espacios
# (+56 9 1234 5678 / 56912345678 / 912345678, etc.). Se usa tanto para el
# teléfono del adoptante como el de contacto del refugio — ambos se comparten
# entre las partes recién cuando una postulación se aprueba, para coordinar
# la entrega (ver botón de WhatsApp en el frontend).
_REGEX_TELEFONO_CL = re.compile(r"^(?:\+?56)?\s*9\s*\d{4}\s*\d{4}$")


def _validar_y_normalizar_telefono(v: str) -> str:
    # Este validador SOLO debe usarse en los esquemas *In (al guardar). Los
    # esquemas *Out (al leer) no lo llevan a propósito: un perfil guardado
    # antes de que esta regla existiera —o con un valor que ya no calza con
    # el formato actual— debe poder seguir LEYÉNDOSE tal cual está en la
    # base de datos. Aplicar esta misma validación en la lectura fue justo
    # el bug que rompió "publicar mascota": el refugio tenía un teléfono
    # antiguo que no pasaba el regex, GET /auth/perfil-refugio explotaba con
    # 500, y mascotas-service (que depende de ese endpoint para resolver el
    # refugio_id) lo traducía en 502 hacia el frontend.
    if not _REGEX_TELEFONO_CL.match(v.strip()):
        raise ValueError(
            "Ingresa un celular chileno válido, ej: +56 9 1234 5678"
        )
    digitos = re.sub(r"\D", "", v)[-9:]  # últimos 9 dígitos: 9XXXXXXXX
    return f"+56 {digitos[0]} {digitos[1:5]} {digitos[5:]}"


def _validar_y_normalizar_telefono_opcional(v: Optional[str]) -> Optional[str]:
    # El teléfono del adoptante es opcional (EditarPerfilAdoptante.tsx deja
    # guardar el resto del cuestionario sin exigirlo — el botón de WhatsApp
    # ya sabe mostrar "no registró un celular" cuando falta). None o string
    # vacío se normalizan a None; solo se valida el formato cuando sí viene
    # un valor, igual que en el frontend.
    if v is None or not v.strip():
        return None
    return _validar_y_normalizar_telefono(v)


class UsuarioRegistro(BaseModel):
    nombre: str
    email: EmailStr
    password: str
    rol: Literal["adoptante", "refugio"]
    telefono: Optional[str] = None

    @field_validator("email")
    @classmethod
    def normalizar_email(cls, v: str) -> str:
        return v.strip().lower()

    @field_validator("telefono")
    @classmethod
    def validar_telefono(cls, v: Optional[str]) -> Optional[str]:
        return _validar_y_normalizar_telefono_opcional(v)


class UsuarioLogin(BaseModel):
    email: EmailStr
    password: str
    # Portal desde el que se inicia sesión. Si viene, el login solo emite token
    # cuando la cuenta tiene ese rol.
    rol: Optional[Literal["adoptante", "refugio"]] = None

    @field_validator("email")
    @classmethod
    def normalizar_email(cls, v: str) -> str:
        return v.strip().lower()


class _ConRut(BaseModel):
    rut: str

    @field_validator("rut")
    @classmethod
    def validar_rut(cls, v: str) -> str:
        numero, dv = parsear_rut(v)
        return f"{numero}-{dv}"

    @property
    def rut_numero(self) -> int:
        return int(self.rut.split("-")[0])


class SolicitudCodigoRefugio(_ConRut):
    pass


class CodigoEnviadoOut(BaseModel):
    correo_enmascarado: str
    expira_en_segundos: int
    reenviar_en_segundos: int


class VerificacionCodigoRefugio(_ConRut):
    codigo: str

    @field_validator("codigo")
    @classmethod
    def validar_codigo(cls, v: str) -> str:
        v = v.strip()
        if not re.fullmatch(r"\d{6}", v):
            raise ValueError("El código debe tener 6 dígitos")
        return v


class UsuarioOut(BaseModel):
    id: int
    nombre: str
    email: Optional[str] = None
    rol: str
    fecha_registro: datetime

    class Config:
        from_attributes = True


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    usuario: UsuarioOut


# Valores del cuestionario del adoptante: espejo de los CHECK de la migración
# 006. Cómo se usa cada respuesta: backend/matching-service/scoring.py.
EspacioDisponible = Literal["departamento", "casa_patio", "casa_grande"]
RestriccionVivienda = Literal["ninguna", "solo_pequenas", "solo_gatos", "no_se"]
HorasSola = Literal["menos_2h", "2_4h", "4_8h", "mas_8h"]
TiempoActividad = Literal["menos_30m", "30_60m", "mas_60m"]
ExperienciaPrevia = Literal["ninguna", "basica", "alta"]
AmbienteHogar = Literal["tranquilo", "moderado", "movido"]
NinosHogar = Literal["no", "mayores", "pequenos"]
Alergias = Literal["ninguna", "perros", "gatos", "ambos"]
AceptaCuidados = Literal["no", "leves", "complejos"]
Especie = Literal["Perro", "Gato"]
Tamano = Literal["pequeno", "mediano", "grande"]
EtapaVida = Literal["cachorro", "joven", "adulto", "senior"]
Sexo = Literal["macho", "hembra"]

# Respuestas sin las que matching-service no calcula recomendaciones; misma
# lista que CAMPOS_CUESTIONARIO en matching-service/scoring.py.
_CAMPOS_CUESTIONARIO = (
    "espacio_disponible",
    "restriccion_vivienda",
    "horas_sola",
    "tiempo_actividad",
    "experiencia_previa",
    "ambiente_hogar",
    "ninos_hogar",
    "alergias",
    "acepta_cuidados",
)


class PerfilAdoptanteIn(BaseModel):
    espacio_disponible: EspacioDisponible
    restriccion_vivienda: RestriccionVivienda
    # Horas seguidas que la mascota quedaría sola en un día normal.
    horas_sola: HorasSola
    # Tiempo diario para pasearla o jugar con ella.
    tiempo_actividad: TiempoActividad
    experiencia_previa: ExperienciaPrevia
    ambiente_hogar: AmbienteHogar
    # Niños que viven o visitan seguido: "mayores" = 6 años o más.
    ninos_hogar: NinosHogar
    tiene_perros: bool = False
    tiene_gatos: bool = False
    alergias: Alergias
    acepta_cuidados: AceptaCuidados
    # Preferencias, None = me da igual: la especie filtra las recomendaciones;
    # tamaño, etapa de vida y sexo solo las ordenan.
    especie_preferida: Optional[Especie] = None
    tamanos_preferidos: Optional[List[Tamano]] = None
    etapas_preferidas: Optional[List[EtapaVida]] = None
    sexo_preferido: Optional[Sexo] = None
    telefono: Optional[str] = None
    foto_perfil: Optional[str] = None

    @field_validator("tamanos_preferidos", "etapas_preferidas")
    @classmethod
    def normalizar_lista(cls, v: Optional[list]) -> Optional[list]:
        # Sin repetidos; una lista vacía también significa "me da igual".
        if not v:
            return None
        return list(dict.fromkeys(v))

    @field_validator("telefono")
    @classmethod
    def validar_telefono(cls, v: Optional[str]) -> Optional[str]:
        return _validar_y_normalizar_telefono_opcional(v)

    @model_validator(mode="after")
    def validar_especie_posible(self):
        # Preferir una especie que las propias respuestas vuelven imposible
        # dejaría las recomendaciones vacías sin explicación.
        imposibles = set()
        if self.alergias in ("perros", "ambos") or self.restriccion_vivienda == "solo_gatos":
            imposibles.add("Perro")
        if self.alergias in ("gatos", "ambos"):
            imposibles.add("Gato")
        if self.especie_preferida in imposibles:
            raise ValueError(
                f"Según tus respuestas, en tu hogar no es posible tener un {self.especie_preferida.lower()}: "
                "elige otra especie o 'Me da igual'."
            )
        return self


class PerfilAdoptanteOut(BaseModel):
    # No hereda de PerfilAdoptanteIn a propósito: no debe llevar su
    # field_validator de teléfono (ver el comentario en
    # _validar_y_normalizar_telefono). telefono es Optional acá porque
    # perfiles guardados antes de que este campo existiera —o con un valor
    # en un formato viejo— deben poder leerse tal cual, sin que
    # GET /auth/perfil-adoptante explote.
    # Las respuestas del cuestionario son Optional: el registro crea el perfil
    # solo con el teléfono y quedan en NULL hasta que el adoptante responde.
    id: int
    usuario_id: int
    espacio_disponible: Optional[EspacioDisponible] = None
    restriccion_vivienda: Optional[RestriccionVivienda] = None
    horas_sola: Optional[HorasSola] = None
    tiempo_actividad: Optional[TiempoActividad] = None
    experiencia_previa: Optional[ExperienciaPrevia] = None
    ambiente_hogar: Optional[AmbienteHogar] = None
    ninos_hogar: Optional[NinosHogar] = None
    tiene_perros: bool = False
    tiene_gatos: bool = False
    alergias: Optional[Alergias] = None
    acepta_cuidados: Optional[AceptaCuidados] = None
    especie_preferida: Optional[Especie] = None
    tamanos_preferidos: Optional[List[Tamano]] = None
    etapas_preferidas: Optional[List[EtapaVida]] = None
    sexo_preferido: Optional[Sexo] = None
    telefono: Optional[str] = None
    foto_perfil: Optional[str] = None

    @computed_field
    @property
    def cuestionario_completo(self) -> bool:
        return all(getattr(self, campo) is not None for campo in _CAMPOS_CUESTIONARIO)

    class Config:
        from_attributes = True


class PerfilRefugioIn(BaseModel):
    nombre_refugio: str
    direccion: Optional[str] = None
    telefono_contacto: str

    @field_validator("nombre_refugio")
    @classmethod
    def validar_nombre(cls, v: str) -> str:
        if len(v.strip()) < 2:
            raise ValueError("Ingresa el nombre del refugio")
        return v.strip()

    @field_validator("telefono_contacto")
    @classmethod
    def validar_telefono(cls, v: str) -> str:
        return _validar_y_normalizar_telefono(v)


class PerfilRefugioOut(BaseModel):
    # No hereda de PerfilRefugioIn — mismo motivo que PerfilAdoptanteOut: la
    # lectura nunca debe aplicar la validación de guardado.
    id: int
    usuario_id: int
    nombre_refugio: str
    direccion: Optional[str] = None
    telefono_contacto: Optional[str] = None

    class Config:
        from_attributes = True