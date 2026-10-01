"""
Carga en la BD las mascotas de ejemplo del CSV generado por generar_mascotas.py
(sin fotos; las fotos se agregan en un paso aparte).

Uso (desde Aplicación/, con el venv de auth-service activo):
    python seed/cargar_mascotas.py [--limite N] [--dry-run]
    python seed/cargar_mascotas.py --borrar --confirmar

- Idempotente: una mascota cuya clave_seed ya existe se omite.
- Todo o nada: si una fila es inválida no se inserta ninguna.
- Solo toca mascotas con origen = 'seed'; nunca las publicadas por un refugio.
"""
import argparse
import csv
import sys
from collections import Counter
from datetime import datetime, timedelta, timezone
from pathlib import Path

import yaml
from sqlalchemy import MetaData, Table, text
from sqlalchemy.dialects.postgresql import insert as pg_insert

from comun import CSV_MASCOTAS, RAIZ, motor

# Mismos catálogos que los CHECK de la migración 006.
NIVELES = {"bajo", "medio", "alto"}
ESPACIOS = {"departamento", "casa_patio", "casa_grande"}
TOLERANCIAS = {"menos_2h", "2_4h", "4_8h", "mas_8h"}
TEMPERAMENTOS = {"sociable", "reservado", "timido"}
SEXOS = {"macho", "hembra"}
TAMANOS = {"pequeno", "mediano", "grande"}
CONVIVENCIA_NINOS = {"todos", "mayores", "no"}
NIVELES_CUIDADOS = {"ninguno", "leves", "complejos"}
BOOLEANOS = {"true": True, "false": False, "": None}


def _de_catalogo(m: dict, campo: str, catalogo: set) -> str:
    if m[campo] not in catalogo:
        raise ValueError(f"{campo} inválido: {m[campo]!r}")
    return m[campo]


def _razas_validas() -> dict:
    config = yaml.safe_load((RAIZ / "seed_config.yaml").read_text(encoding="utf-8"))
    return {
        "Perro": set(config["perros"]["razas"]) | {config["perros"]["raza_mestizo"]},
        "Gato": set(config["gatos"]["razas"]) | {config["gatos"]["raza_mestizo"]},
    }


def leer_csv(ruta: Path, refugios_por_id: dict) -> tuple[list, list]:
    razas = _razas_validas()
    # UTC sin zona horaria, igual que el now() del servidor en la columna timestamp.
    ahora = datetime.now(timezone.utc).replace(tzinfo=None)
    filas, errores = [], []
    with ruta.open(encoding="utf-8-sig", newline="") as archivo:
        for n, m in enumerate(csv.DictReader(archivo), start=2):
            try:
                refugio_id = int(m["refugio_id"])
                if refugios_por_id.get(refugio_id) != m["rut"]:
                    raise ValueError(f"refugio {refugio_id} no corresponde al RUT {m['rut']} en esta BD")
                if m["especie"] not in razas or m["raza"] not in razas[m["especie"]]:
                    raise ValueError(f"especie/raza fuera de catálogo: {m['especie']} / {m['raza']}")
                # Tamaño adulto: obligatorio en perros, vacío en gatos.
                if m["especie"] == "Perro":
                    tamano = _de_catalogo(m, "tamano", TAMANOS)
                elif m["tamano"]:
                    raise ValueError("un gato no lleva tamaño")
                else:
                    tamano = None
                nivel_cuidados = _de_catalogo(m, "nivel_cuidados", NIVELES_CUIDADOS)
                if nivel_cuidados != "ninguno" and not m["cuidados_especiales"].strip():
                    raise ValueError("cuidados especiales sin describir")
                edad = int(m["edad"])
                if edad < 0:
                    raise ValueError("edad negativa")
                if not m["nombre"].strip() or not m["clave_seed"].startswith("seed-"):
                    raise ValueError("nombre o clave_seed inválidos")
                if m["convivencia_ninos"] and m["convivencia_ninos"] not in CONVIVENCIA_NINOS:
                    raise ValueError(f"convivencia_ninos inválido: {m['convivencia_ninos']!r}")
                filas.append({
                    "refugio_id": refugio_id,
                    "nombre": m["nombre"].strip(),
                    "especie": m["especie"],
                    "raza": m["raza"],
                    "edad": edad,
                    "sexo": _de_catalogo(m, "sexo", SEXOS),
                    "tamano": tamano,
                    "espacio_minimo_requerido": _de_catalogo(m, "espacio_minimo_requerido", ESPACIOS),
                    "tolerancia_soledad": _de_catalogo(m, "tolerancia_soledad", TOLERANCIAS),
                    "nivel_energia": _de_catalogo(m, "nivel_energia", NIVELES),
                    "nivel_experiencia_requerida": _de_catalogo(m, "nivel_experiencia_requerida", NIVELES),
                    "temperamento": _de_catalogo(m, "temperamento", TEMPERAMENTOS),
                    "convivencia_ninos": m["convivencia_ninos"] or None,
                    "convive_perros": BOOLEANOS[m["convive_perros"]],
                    "convive_gatos": BOOLEANOS[m["convive_gatos"]],
                    "nivel_cuidados": nivel_cuidados,
                    "cuidados_especiales": m["cuidados_especiales"].strip() or None,
                    "esterilizado": BOOLEANOS[m["esterilizado"]],
                    "vacunas_al_dia": BOOLEANOS[m["vacunas_al_dia"]],
                    "desparasitado": BOOLEANOS[m["desparasitado"]],
                    "microchip": BOOLEANOS[m["microchip"]],
                    "estado": "disponible",
                    "fecha_publicacion": ahora - timedelta(days=int(m["dias_publicada"])),
                    "origen": "seed",
                    "clave_seed": m["clave_seed"],
                })
            except (KeyError, ValueError) as e:
                errores.append(f"Fila {n}: {e}")

    claves = Counter(f["clave_seed"] for f in filas)
    repetidas = [c for c, k in claves.items() if k > 1]
    if repetidas:
        errores.append(f"clave_seed repetidas en el CSV: {repetidas[:5]}")
    return filas, errores


def resumen(conexion) -> str:
    fila = conexion.execute(text("""
        SELECT count(*) FILTER (WHERE origen = 'seed') AS seed,
               count(*) FILTER (WHERE origen = 'manual') AS manual,
               count(DISTINCT refugio_id) FILTER (WHERE origen = 'seed') AS refugios_seed
        FROM mascotas
    """)).one()
    return (f"En la BD: {fila.seed} mascotas seed en {fila.refugios_seed} refugios "
            f"| {fila.manual} publicadas por refugios (no se tocan)")


def cargar(args):
    conexion = motor().connect()
    transaccion = conexion.begin()
    try:
        refugios_por_id = {
            r.id: f"{r.rut}-{r.dv}"
            for r in conexion.execute(text("""
                SELECT r.id, o.rut, o.dv FROM refugios r
                JOIN organizaciones_validadas o ON o.id = r.organizacion_id
            """))
        }
        filas, errores = leer_csv(args.csv, refugios_por_id)
        print(f"Filas válidas en el CSV: {len(filas)} | con errores: {len(errores)}")
        for e in errores[:20]:
            print(f"  ✗ {e}")
        if errores:
            raise SystemExit("No se cargó nada: corrige el CSV (o regenéralo) y vuelve a ejecutar.")

        if args.limite is not None:
            filas = filas[: args.limite]

        existentes = set(conexion.execute(
            text("SELECT clave_seed FROM mascotas WHERE clave_seed = ANY(:claves)"),
            {"claves": [f["clave_seed"] for f in filas]},
        ).scalars())
        nuevas = [f for f in filas if f["clave_seed"] not in existentes]

        if nuevas:
            tabla = Table("mascotas", MetaData(), autoload_with=conexion)
            conexion.execute(
                pg_insert(tabla).on_conflict_do_nothing(index_elements=["clave_seed"]), nuevas
            )
        print(f"Insertadas: {len(nuevas)} | ya existían: {len(existentes)}")
        print(resumen(conexion))

        if args.dry_run:
            transaccion.rollback()
            print("Dry-run: no se escribió nada en la BD.")
        else:
            transaccion.commit()
    except BaseException:
        if transaccion.is_active:
            transaccion.rollback()
        raise
    finally:
        conexion.close()


def borrar(args):
    if not args.confirmar:
        raise SystemExit("Para borrar todas las mascotas seed agrega --confirmar.")
    with motor().begin() as conexion:
        postulaciones = conexion.execute(text("""
            SELECT count(*) FROM postulaciones p JOIN mascotas m ON m.id = p.mascota_id
            WHERE m.origen = 'seed'
        """)).scalar()
        if postulaciones:
            raise SystemExit(f"No se borró nada: hay {postulaciones} postulaciones reales a mascotas seed.")
        fotos = conexion.execute(text("""
            SELECT count(*) FROM fotos_mascota f JOIN mascotas m ON m.id = f.mascota_id
            WHERE m.origen = 'seed'
        """)).scalar()
        if fotos:
            raise SystemExit(f"No se borró nada: {fotos} mascotas seed tienen fotos en Cloudinary; "
                             "bórralas primero con el script de fotos.")
        # matches son puntajes calculados por matching-service; se recalculan solos.
        matches = conexion.execute(text("""
            DELETE FROM matches WHERE mascota_id IN (SELECT id FROM mascotas WHERE origen = 'seed')
        """)).rowcount
        borradas = conexion.execute(text("DELETE FROM mascotas WHERE origen = 'seed'")).rowcount
        print(f"Borradas: {borradas} mascotas seed y {matches} puntajes de compatibilidad asociados.")
        print(resumen(conexion))


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--csv", type=Path, default=CSV_MASCOTAS)
    parser.add_argument("--limite", type=int, help="Carga solo las primeras N filas del CSV")
    parser.add_argument("--dry-run", action="store_true", help="Valida e inserta dentro de una transacción que se deshace")
    parser.add_argument("--borrar", action="store_true", help="Borra todas las mascotas con origen = 'seed'")
    parser.add_argument("--confirmar", action="store_true", help="Requerido junto con --borrar")
    args = parser.parse_args()

    if args.borrar:
        borrar(args)
    else:
        cargar(args)


if __name__ == "__main__":
    sys.exit(main())
