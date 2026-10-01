"""
Motor de matching por reglas — v2 (3 capas).

Diseño documentado para la defensa del proyecto. Cada pregunta del
cuestionario del adoptante tiene su espejo en la ficha de la mascota, y el
resultado se arma en 3 capas:

1. Exclusión (¿es seguro?): incompatibilidades que hacen fracasar una
   adopción — niños, perros o gatos en casa, alergias, cuidados que el
   adoptante no puede asumir y condiciones de la vivienda. Una mascota
   excluida no aparece en Recomendaciones; en Explorar se muestra como
   "No compatible" con el motivo. "No lo sabemos" (NULL) nunca excluye:
   genera una alerta.

2. Compatibilidad (¿puede cuidarla bien?): el % de afinidad. Todos los
   criterios comparan un RECURSO del hogar con una NECESIDAD de la mascota
   ("cumple o supera"): 1.0 si la cubre, 0.5 si le falta un nivel, 0.0 si
   le faltan dos o más. Tener de más nunca resta: una persona muy activa
   puede adoptar un perro senior tranquilo.

       soledad      30%  horas que quedaría sola  ↔ horas que tolera
       actividad    25%  tiempo para pasear/jugar ↔ actividad que necesita
       experiencia  20%  experiencia previa       ↔ experiencia requerida
       ambiente     15%  calma del hogar          ↔ temperamento
       espacio      10%  vivienda                 ↔ espacio mínimo

   Los pesos siguen el orden de las causas más citadas de devolución tras la
   adopción: problemas de conducta (separación, exceso de energía, manejo
   difícil) por sobre el espacio, que casi no aparece como motivo por sí
   solo (Powell et al. 2021, Scientific Reports; Mundschau y Suchak 2023,
   Animals). Son un punto de partida para recalibrar con los resultados de
   seguimiento-service.

   Tope: si un criterio queda en 0.0, el total no supera 0.5. Una brecha
   crítica (por ejemplo, no tolera estar sola y quedaría más de 8 h) no se
   compensa con los demás criterios.

3. Preferencias (¿es lo que busca?): la especie filtra la lista de
   Recomendaciones (ver main.py); tamaño, etapa de vida y sexo solo ordenan.
   Ninguna preferencia cambia el %.
"""
from dataclasses import dataclass
from typing import List, Optional

VERSION_DESGLOSE = 2

PESOS = {
    "soledad": 0.30,
    "actividad": 0.25,
    "experiencia": 0.20,
    "ambiente": 0.15,
    "espacio": 0.10,
}
TOPE_BRECHA_CRITICA = 0.5

# Sin estas respuestas no hay nada que comparar (perfil recién registrado).
CAMPOS_CUESTIONARIO = (
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

# Escalas de la capa de compatibilidad: recurso del adoptante y necesidad de
# la mascota en niveles comparables (más alto = más recurso / más necesidad).
_RECURSO_ACTIVIDAD = {"menos_30m": 1, "30_60m": 2, "mas_60m": 3}
_RECURSO_EXPERIENCIA = {"ninguna": 1, "basica": 2, "alta": 3}
_RECURSO_CALMA = {"movido": 1, "moderado": 2, "tranquilo": 3}
_NECESIDAD_CALMA = {"sociable": 1, "reservado": 2, "timido": 3}
_ESPACIO = {"departamento": 1, "casa_patio": 2, "casa_grande": 3}
_NIVEL = {"bajo": 1, "medio": 2, "alto": 3}
# Horas sola (adoptante) y tolerancia a la soledad (mascota) usan los mismos
# tramos: falta recurso cuando quedaría sola más tramos de los que tolera.
_TRAMO_HORAS = {"menos_2h": 1, "2_4h": 2, "4_8h": 3, "mas_8h": 4}

_CUIDADOS = {"ninguno": 0, "no": 0, "leves": 1, "complejos": 2}


@dataclass
class Motivo:
    codigo: str
    mensaje: str


@dataclass
class Criterio:
    criterio: str
    peso: float
    puntaje: float
    adoptante: str
    mascota: str


@dataclass
class Evaluacion:
    score: float
    desglose: List[Criterio]
    exclusiones: List[Motivo]
    alertas: List[Motivo]
    # Preferencias de orden (tamano, etapa, sexo) que la mascota no cumple.
    discrepancias: List[str]
    coincide_especie: bool
    tope_aplicado: bool = False
    etapa: Optional[str] = None

    @property
    def excluida(self) -> bool:
        return bool(self.exclusiones)

    def a_json(self) -> dict:
        """Forma en que se guarda en matches.desglose."""
        return {
            "version": VERSION_DESGLOSE,
            "criterios": [vars(c) for c in self.desglose],
            "exclusiones": [vars(m) for m in self.exclusiones],
            "alertas": [vars(m) for m in self.alertas],
            "discrepancias": self.discrepancias,
            "tope_aplicado": self.tope_aplicado,
        }


def cuestionario_completo(perfil) -> bool:
    return all(getattr(perfil, campo) is not None for campo in CAMPOS_CUESTIONARIO)


def etapa_de_vida(edad: Optional[int]) -> Optional[str]:
    if edad is None:
        return None
    if edad < 1:
        return "cachorro"
    if edad <= 2:
        return "joven"
    if edad <= 7:
        return "adulto"
    return "senior"


def _puntaje(brecha: int) -> float:
    if brecha <= 0:
        return 1.0
    if brecha == 1:
        return 0.5
    return 0.0


# ---------- Capa 1: exclusiones y alertas ----------

def _exclusiones(perfil, mascota) -> List[Motivo]:
    motivos = []
    es_perro = mascota.especie == "Perro"

    if es_perro and perfil.restriccion_vivienda == "solo_gatos":
        motivos.append(Motivo("vivienda_solo_gatos", "Tu vivienda solo permite gatos."))
    if es_perro and perfil.restriccion_vivienda == "solo_pequenas" and mascota.tamano != "pequeno":
        motivos.append(Motivo("vivienda_solo_pequenas", "Tu vivienda solo permite mascotas pequeñas."))

    if perfil.alergias in ("ambos", "perros" if es_perro else "gatos"):
        especie = "perros" if es_perro else "gatos"
        motivos.append(Motivo("alergia", f"Alguien en tu hogar tiene alergia a los {especie}."))

    if perfil.ninos_hogar == "pequenos" and mascota.convivencia_ninos in ("mayores", "no"):
        motivos.append(Motivo("ninos_pequenos", "No es apta para convivir con niños menores de 6 años."))
    elif perfil.ninos_hogar == "mayores" and mascota.convivencia_ninos == "no":
        motivos.append(Motivo("ninos", "No convive bien con niños."))

    if perfil.tiene_perros and mascota.convive_perros is False:
        motivos.append(Motivo("convive_perros", "No convive bien con perros."))
    if perfil.tiene_gatos and mascota.convive_gatos is False:
        motivos.append(Motivo("convive_gatos", "No convive bien con gatos."))

    if _CUIDADOS[mascota.nivel_cuidados] > _CUIDADOS[perfil.acepta_cuidados]:
        motivos.append(Motivo("cuidados", "Necesita cuidados especiales que indicaste no poder asumir."))

    return motivos


def _alertas(perfil, mascota) -> List[Motivo]:
    alertas = []
    if perfil.ninos_hogar != "no" and mascota.convivencia_ninos is None:
        alertas.append(Motivo("ninos_sin_evaluar", "El refugio aún no evaluó cómo convive con niños."))
    if perfil.tiene_perros and mascota.convive_perros is None:
        alertas.append(Motivo("perros_sin_evaluar", "El refugio aún no evaluó cómo convive con perros."))
    if perfil.tiene_gatos and mascota.convive_gatos is None:
        alertas.append(Motivo("gatos_sin_evaluar", "El refugio aún no evaluó cómo convive con gatos."))
    if perfil.restriccion_vivienda == "no_se":
        alertas.append(Motivo(
            "vivienda_por_confirmar",
            "Confirma con tu arrendador o la administración que puedes tener mascotas.",
        ))
    return alertas


# ---------- Capa 2: compatibilidad ----------

def _criterios(perfil, mascota) -> List[Criterio]:
    brechas = {
        "soledad": (
            _TRAMO_HORAS[perfil.horas_sola] - _TRAMO_HORAS[mascota.tolerancia_soledad],
            perfil.horas_sola, mascota.tolerancia_soledad,
        ),
        "actividad": (
            _NIVEL[mascota.nivel_energia] - _RECURSO_ACTIVIDAD[perfil.tiempo_actividad],
            perfil.tiempo_actividad, mascota.nivel_energia,
        ),
        "experiencia": (
            _NIVEL[mascota.nivel_experiencia_requerida] - _RECURSO_EXPERIENCIA[perfil.experiencia_previa],
            perfil.experiencia_previa, mascota.nivel_experiencia_requerida,
        ),
        "ambiente": (
            _NECESIDAD_CALMA[mascota.temperamento] - _RECURSO_CALMA[perfil.ambiente_hogar],
            perfil.ambiente_hogar, mascota.temperamento,
        ),
        "espacio": (
            _ESPACIO[mascota.espacio_minimo_requerido] - _ESPACIO[perfil.espacio_disponible],
            perfil.espacio_disponible, mascota.espacio_minimo_requerido,
        ),
    }
    return [
        Criterio(nombre, PESOS[nombre], _puntaje(brecha), adoptante, valor_mascota)
        for nombre, (brecha, adoptante, valor_mascota) in brechas.items()
    ]


# ---------- Capa 3: preferencias ----------

def _discrepancias(perfil, mascota, etapa: Optional[str]) -> List[str]:
    discrepancias = []
    # El tamaño solo aplica a perros: un gato no contradice esa preferencia.
    if perfil.tamanos_preferidos and mascota.especie == "Perro" and mascota.tamano not in perfil.tamanos_preferidos:
        discrepancias.append("tamano")
    if perfil.etapas_preferidas and etapa not in perfil.etapas_preferidas:
        discrepancias.append("etapa")
    if perfil.sexo_preferido and mascota.sexo != perfil.sexo_preferido:
        discrepancias.append("sexo")
    return discrepancias


def evaluar(perfil, mascota) -> Evaluacion:
    """Recibe un PerfilAdoptante con el cuestionario completo y una Mascota
    (modelos ORM o cualquier objeto con los mismos atributos)."""
    criterios = _criterios(perfil, mascota)
    score = sum(c.puntaje * c.peso for c in criterios)
    tope_aplicado = any(c.puntaje == 0.0 for c in criterios) and score > TOPE_BRECHA_CRITICA
    if tope_aplicado:
        score = TOPE_BRECHA_CRITICA

    etapa = etapa_de_vida(mascota.edad)
    return Evaluacion(
        score=round(score, 3),
        desglose=criterios,
        exclusiones=_exclusiones(perfil, mascota),
        alertas=_alertas(perfil, mascota),
        discrepancias=_discrepancias(perfil, mascota, etapa),
        coincide_especie=not perfil.especie_preferida or mascota.especie == perfil.especie_preferida,
        tope_aplicado=tope_aplicado,
        etapa=etapa,
    )
