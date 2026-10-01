"""
Genera las mascotas de ejemplo para los refugios de la nómina SII.

Uso (desde Aplicación/, con el venv de auth-service activo):
    python seed/generar_mascotas.py [--config seed/seed_config.yaml] [--salida seed/salida/mascotas.csv]

No escribe en la BD: solo lee los refugios y produce un CSV para revisar.
Es determinista: cada refugio usa su propio generador (semilla + RUT), así que
agregar o quitar refugios no cambia las mascotas de los demás.
"""
import argparse
import csv
import random
import sys
import unicodedata
from collections import Counter
from pathlib import Path

import yaml
from sqlalchemy import text

from comun import CSV_MASCOTAS, RAIZ, motor

NIVELES = ["bajo", "medio", "alto"]
COLUMNAS = [
    "clave_seed", "refugio_id", "rut", "refugio", "region",
    "nombre", "especie", "raza", "sexo", "tamano", "edad",
    "nivel_energia", "tolerancia_soledad", "temperamento", "reactiva", "nivel_experiencia_requerida",
    "espacio_minimo_requerido", "convivencia_ninos", "convive_perros", "convive_gatos",
    "nivel_cuidados", "cuidados_especiales",
    "esterilizado", "vacunas_al_dia", "desparasitado", "microchip", "dias_publicada",
]


def _sin_tildes(texto: str) -> str:
    return unicodedata.normalize("NFKD", texto).encode("ascii", "ignore").decode().lower()


def _elegir(rng: random.Random, pesos: dict):
    claves = list(pesos)
    return rng.choices(claves, weights=[pesos[k] for k in claves])[0]


def _subir(nivel: str, pasos: int = 1) -> str:
    return NIVELES[min(2, NIVELES.index(nivel) + pasos)]


def _bajar(nivel: str, pasos: int = 1) -> str:
    return NIVELES[max(0, NIVELES.index(nivel) - pasos)]


def _cantidad(rng: random.Random, config: dict, actividad: str) -> int:
    reglas = config["cantidad_por_refugio"]
    minimo, maximo = reglas["minimo"], reglas["maximo"]
    actividad = _sin_tildes(actividad or "")
    for ajuste in reglas.get("ajustes_por_actividad", []):
        if any(_sin_tildes(p) in actividad for p in ajuste["palabras"]):
            minimo, maximo = ajuste["minimo"], ajuste["maximo"]
            break
    return rng.randint(minimo, maximo)


def _bool_o_nulo(rng: random.Random, prob_si: float, prob_nulo: float, forzar_no: bool) -> str:
    if rng.random() < prob_nulo:
        return ""
    if forzar_no:
        return "false"
    return "true" if rng.random() < prob_si else "false"


def generar_mascota(rng: random.Random, config: dict, nombres_usados: set) -> dict:
    especie = _elegir(rng, {k: v for k, v in config["especies"].items() if k != "fuente"})

    # Edad por etapa de vida
    etapas = {k: v for k, v in config["edad"].items() if k != "fuente"}
    etapa = _elegir(rng, {k: v[0] for k, v in etapas.items()})
    edad = rng.randint(etapas[etapa][1], etapas[etapa][2])

    # Raza, tamaño y rasgos base
    if especie == "Perro":
        cfg = config["perros"]
        if rng.random() < cfg["proporcion_mestizos"]:
            raza = cfg["raza_mestizo"]
            tamano = _elegir(rng, cfg["tamanos_mestizo"])
            energia = _elegir(rng, {"bajo": 0.25, "medio": 0.45, "alto": 0.30})
            experiencia = "bajo"
        else:
            raza = _elegir(rng, {r: v[0] for r, v in cfg["razas"].items()})
            _, tamano, energia, experiencia = cfg["razas"][raza]
    else:
        cfg = config["gatos"]
        tamano = "pequeno"
        if rng.random() < cfg["proporcion_mestizos"]:
            raza = cfg["raza_mestizo"]
            energia = _elegir(rng, {"bajo": 0.30, "medio": 0.45, "alto": 0.25})
            experiencia = "bajo"
        else:
            raza = _elegir(rng, {r: v[0] for r, v in cfg["razas"].items()})
            _, energia, experiencia = cfg["razas"][raza]

    # Regla: la etapa de vida ajusta la energía
    if etapa == "cachorro":
        energia = "alto" if rng.random() < 0.7 else "medio"
    elif etapa == "senior":
        energia = "bajo" if rng.random() < 0.6 else _bajar(energia)

    # Tolerancia a estar sola según etapa de vida y especie
    if etapa in ("cachorro", "senior"):
        tramo_soledad = etapa
    else:
        tramo_soledad = "adulto_perro" if especie == "Perro" else "adulto_gato"
    tolerancia = _elegir(rng, config["tolerancia_soledad"][tramo_soledad])

    # Regla: un animal reactivo exige más experiencia y nunca es "sociable"
    reactiva = rng.random() < config["reactividad"]["probabilidad"]
    if reactiva:
        experiencia = _subir(experiencia)
    temperamento = _elegir(rng, config["temperamento"]["reactiva" if reactiva else "no_reactiva"])

    # Cuidados especiales (más frecuentes en seniors) exigen experiencia media o más
    cuidados_cfg = config["cuidados_especiales"]
    cuidados, nivel_cuidados = "", "ninguno"
    if etapa == "senior" and rng.random() < cuidados_cfg["probabilidad_senior"]:
        cuidados, nivel_cuidados = rng.choice(cuidados_cfg["senior"])
    elif rng.random() < cuidados_cfg["probabilidad_general"]:
        cuidados, nivel_cuidados = rng.choice(cuidados_cfg["general"])
    if cuidados and experiencia == "bajo":
        experiencia = "medio"

    # Regla: espacio según especie, tamaño y energía
    if especie == "Gato" or tamano == "pequeno":
        espacio = "departamento"
    elif tamano == "mediano":
        espacio = "casa_patio" if energia == "alto" else "departamento"
    else:
        espacio = "casa_grande" if energia == "alto" and edad > 0 else "casa_patio"

    # Convivencia: un animal reactivo nunca se declara compatible
    comp = config["compatibilidad"]
    if rng.random() < comp["sin_dato"]:
        ninos = ""
    elif reactiva:
        ninos = "no"
    else:
        ninos = _elegir(rng, comp["ninos"])
    convive_perros = _bool_o_nulo(rng, comp["convive_perros_si"][especie], comp["sin_dato"], reactiva)
    convive_gatos = _bool_o_nulo(rng, comp["convive_gatos_si"][especie], comp["sin_dato"], reactiva)

    # Ficha de salud (informativa)
    salud = config["salud"]
    esterilizado = _bool_o_nulo(rng, salud["esterilizado"][etapa], salud["sin_dato"], False)
    vacunas = _bool_o_nulo(rng, salud["vacunas_al_dia"], salud["sin_dato"], False)
    desparasitado = _bool_o_nulo(rng, salud["desparasitado"], salud["sin_dato"], False)
    microchip = _bool_o_nulo(rng, salud["microchip"], salud["sin_dato"], False)

    sexo = _elegir(rng, {k: v for k, v in config["sexo"].items() if k != "fuente"})
    disponibles = [n for n in config["nombres"][especie] if n not in nombres_usados]
    nombre = rng.choice(disponibles or config["nombres"][especie])
    nombres_usados.add(nombre)

    return {
        "nombre": nombre,
        "especie": especie,
        "raza": raza,
        "sexo": sexo,
        # El tamaño solo se registra en perros (CHECK chk_mascota_tamano_perro).
        "tamano": tamano if especie == "Perro" else "",
        "edad": edad,
        "nivel_energia": energia,
        "tolerancia_soledad": tolerancia,
        "temperamento": temperamento,
        "reactiva": "true" if reactiva else "false",
        "nivel_experiencia_requerida": experiencia,
        "espacio_minimo_requerido": espacio,
        "convivencia_ninos": ninos,
        "convive_perros": convive_perros,
        "convive_gatos": convive_gatos,
        "nivel_cuidados": nivel_cuidados,
        "cuidados_especiales": cuidados,
        "esterilizado": esterilizado,
        "vacunas_al_dia": vacunas,
        "desparasitado": desparasitado,
        "microchip": microchip,
    }


def leer_refugios() -> list:
    with motor().connect() as conexion:
        return conexion.execute(text("""
            SELECT r.id AS refugio_id, o.rut, o.dv, r.nombre_refugio, o.actividad, o.region
            FROM refugios r
            JOIN organizaciones_validadas o ON o.id = r.organizacion_id
            WHERE NOT o.es_prueba
            ORDER BY o.rut
        """)).all()


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--config", type=Path, default=RAIZ / "seed_config.yaml")
    parser.add_argument("--salida", type=Path, default=CSV_MASCOTAS)
    args = parser.parse_args()

    config = yaml.safe_load(args.config.read_text(encoding="utf-8"))
    refugios = leer_refugios()

    filas = []
    for refugio in refugios:
        rng = random.Random(f"{config['semilla']}:{refugio.rut}")
        nombres_usados: set = set()
        for n in range(1, _cantidad(rng, config, refugio.actividad) + 1):
            mascota = generar_mascota(rng, config, nombres_usados)
            clave = f"seed-{refugio.rut}-{n:02d}"
            # Generador aparte: la fecha no altera la secuencia de los demás atributos.
            rng_fecha = random.Random(f"{config['semilla']}:{clave}:publicacion")
            filas.append({
                "clave_seed": clave,
                "refugio_id": refugio.refugio_id,
                "rut": f"{refugio.rut}-{refugio.dv}",
                "refugio": refugio.nombre_refugio,
                "region": refugio.region,
                **mascota,
                "dias_publicada": rng_fecha.randint(1, config["publicacion"]["dias_maximo"]),
            })

    args.salida.parent.mkdir(parents=True, exist_ok=True)
    with args.salida.open("w", newline="", encoding="utf-8-sig") as archivo:
        escritor = csv.DictWriter(archivo, fieldnames=COLUMNAS)
        escritor.writeheader()
        escritor.writerows(filas)

    def resumen(campo):
        conteo = Counter(f[campo] for f in filas)
        return ", ".join(f"{'sin dato' if k == '' else k}={v} ({v / len(filas):.0%})" for k, v in conteo.most_common())

    por_refugio = Counter(f["refugio_id"] for f in filas).values()
    print(f"Refugios: {len(refugios)} | mascotas: {len(filas)} "
          f"| por refugio: min {min(por_refugio)}, max {max(por_refugio)}, "
          f"promedio {len(filas) / len(refugios):.1f}")
    for campo in ["especie", "sexo", "tamano", "raza", "edad", "nivel_energia", "tolerancia_soledad",
                  "temperamento", "nivel_experiencia_requerida", "espacio_minimo_requerido",
                  "convivencia_ninos", "convive_perros", "convive_gatos", "nivel_cuidados",
                  "esterilizado", "microchip"]:
        print(f"- {campo}: {resumen(campo)}")
    print(f"CSV: {args.salida}")


if __name__ == "__main__":
    sys.exit(main())
