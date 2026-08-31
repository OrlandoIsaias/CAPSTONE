"""
Motor de scoring por reglas ponderadas — v1 (MVP).

Diseño documentado para la defensa del proyecto:

Pesos de cada criterio sobre el score final (deben sumar 1.0):
    espacio             20%   — "cumple o supera" (tener de más no resta)
    actividad/energía   20%   — cercanía (buscamos coincidencia, no un mínimo)
    experiencia         20%   — "cumple o supera"
    tiempo/socialización 20%  — cercanía (tiempo en horas se traduce a nivel)
    compatible_ninos    10%   — restricción dura (0 o 1, tema de seguridad)
    compatible_otras_mascotas 10% — restricción dura (0 o 1)

Estas dos familias de comparación reflejan una decisión de diseño real:
- "Cumple o supera" se usa donde el valor del adoptante es un RECURSO
  (espacio, experiencia) que la mascota exige como mínimo. Tener más de lo
  necesario no debe penalizar.
- "Cercanía" se usa donde ambos valores son una PREFERENCIA/RITMO DE VIDA
  (energía, tiempo disponible) — un desajuste en cualquier dirección es malo:
  tanto un perro muy activo con un dueño sedentario, como uno muy tranquilo
  con un dueño hiperactivo, son peores matches que una coincidencia exacta.

Nota sobre valores None/nulos: si un campo de la mascota no fue especificado
(por ejemplo compatible_ninos=None), se asume que NO hay información
suficiente para penalizar, y ese criterio puntúa 1.0 (beneficio de la duda).
Esto es una decisión de producto, no un accidente — está pensado para que
refugios con fichas incompletas no queden injustamente mal rankeados.
"""
from typing import Optional

PESOS = {
    "espacio": 0.20,
    "actividad": 0.20,
    "experiencia": 0.20,
    "tiempo_socializacion": 0.20,
    "ninos": 0.10,
    "otras_mascotas": 0.10,
}

_ESCALA_ESPACIO = {"departamento": 1, "casa_patio": 2, "casa_grande": 3}
_ESCALA_NIVEL = {"bajo": 1, "medio": 2, "alto": 3}
_MAPA_EXPERIENCIA_ADOPTANTE = {"ninguna": "bajo", "basica": "medio", "alta": "alto"}


def _cumple_o_supera(nivel_adoptante: int, nivel_requerido: int) -> float:
    """1.0 si el adoptante iguala o supera el requisito; penaliza por cada
    nivel de diferencia si le falta."""
    brecha = nivel_requerido - nivel_adoptante
    if brecha <= 0:
        return 1.0
    if brecha == 1:
        return 0.5
    return 0.0


def _cercania(nivel_a: int, nivel_b: int) -> float:
    """1.0 si coinciden exactamente; penaliza por cada nivel de distancia,
    en cualquier dirección."""
    diferencia = abs(nivel_a - nivel_b)
    if diferencia == 0:
        return 1.0
    if diferencia == 1:
        return 0.5
    return 0.0


def _horas_a_nivel(horas: Optional[int]) -> int:
    """Convierte tiempo_disponible_horas_dia (0-24) a la misma escala
    bajo/medio/alto que usa nivel_socializacion de la mascota."""
    if horas is None:
        horas = 0
    if horas <= 2:
        return 1  # bajo
    if horas <= 5:
        return 2  # medio
    return 3  # alto


def calcular_score(perfil, mascota) -> float:
    """Recibe un PerfilAdoptante y una Mascota (modelos ORM) y devuelve
    un score entre 0.0 y 1.0."""

    # 1. Espacio — cumple o supera
    nivel_espacio_adoptante = _ESCALA_ESPACIO.get(perfil.espacio_disponible, 1)
    nivel_espacio_requerido = _ESCALA_ESPACIO.get(mascota.espacio_minimo_requerido, 1)
    score_espacio = _cumple_o_supera(nivel_espacio_adoptante, nivel_espacio_requerido)

    # 2. Actividad física vs. energía de la mascota — cercanía
    nivel_actividad = _ESCALA_NIVEL.get(perfil.nivel_actividad_fisica, 2)
    nivel_energia = _ESCALA_NIVEL.get(mascota.nivel_energia, 2)
    score_actividad = _cercania(nivel_actividad, nivel_energia)

    # 3. Experiencia — cumple o supera (con traducción de escala)
    experiencia_adoptante_traducida = _MAPA_EXPERIENCIA_ADOPTANTE.get(perfil.experiencia_previa, "bajo")
    nivel_experiencia_adoptante = _ESCALA_NIVEL.get(experiencia_adoptante_traducida, 1)
    nivel_experiencia_requerida = _ESCALA_NIVEL.get(mascota.nivel_experiencia_requerida, 1)
    score_experiencia = _cumple_o_supera(nivel_experiencia_adoptante, nivel_experiencia_requerida)

    # 4. Tiempo disponible vs. socialización requerida — cercanía (con conversión)
    nivel_tiempo = _horas_a_nivel(perfil.tiempo_disponible_horas_dia)
    nivel_socializacion = _ESCALA_NIVEL.get(mascota.nivel_socializacion, 2)
    score_tiempo = _cercania(nivel_tiempo, nivel_socializacion)

    # 5. Compatibilidad con niños — restricción dura
    if perfil.tiene_ninos and mascota.compatible_ninos is False:
        score_ninos = 0.0
    else:
        score_ninos = 1.0

    # 6. Compatibilidad con otras mascotas — restricción dura
    if perfil.otras_mascotas and mascota.compatible_otras_mascotas is False:
        score_otras_mascotas = 0.0
    else:
        score_otras_mascotas = 1.0

    score_final = (
        score_espacio * PESOS["espacio"]
        + score_actividad * PESOS["actividad"]
        + score_experiencia * PESOS["experiencia"]
        + score_tiempo * PESOS["tiempo_socializacion"]
        + score_ninos * PESOS["ninos"]
        + score_otras_mascotas * PESOS["otras_mascotas"]
    )

    return round(score_final, 3)