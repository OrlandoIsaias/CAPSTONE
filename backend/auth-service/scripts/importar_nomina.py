"""
Importa la nómina SII (Excel) a la tabla organizaciones_validadas.

Uso (desde backend/auth-service, con el venv activo):
    python scripts/importar_nomina.py "<ruta al .xlsx>" [--dry-run]

- Idempotente: si el RUT ya existe, actualiza sus datos en vez de duplicarlo.
- Un correo ya cargado en la BD nunca se borra si en el Excel viene vacío.
- Todo o nada: si una fila es inválida no se escribe ninguna.
"""
import argparse
import re
import sys
import unicodedata
from datetime import date, datetime
from pathlib import Path

import openpyxl
from sqlalchemy import text

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from database import engine  # noqa: E402
from rut import calcular_dv  # noqa: E402

COLUMNAS = {
    "rut": "RUT",
    "dv": "DV",
    "razon_social": "NOMBRE O RAZON SOCIAL",
    "actividad": "ACTIVIDAD",
    "unidad_sii": "UNIDAD SII",
    "direccion": "DIRECCION",
    "comuna": "COMUNA",
    "fecha_inscripcion": "FECHA INSCRIPCION",
    "region": "REGION",
    "correo": "CORREO",
}
OBLIGATORIAS = {"rut", "dv", "razon_social"}
REGEX_CORREO = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")

SQL_UPSERT = text("""
    INSERT INTO organizaciones_validadas
        (rut, dv, razon_social, actividad, unidad_sii, direccion, comuna, region, fecha_inscripcion, correo)
    VALUES
        (:rut, :dv, :razon_social, :actividad, :unidad_sii, :direccion, :comuna, :region, :fecha_inscripcion, :correo)
    ON CONFLICT (rut) DO UPDATE SET
        dv = EXCLUDED.dv,
        razon_social = EXCLUDED.razon_social,
        actividad = EXCLUDED.actividad,
        unidad_sii = EXCLUDED.unidad_sii,
        direccion = EXCLUDED.direccion,
        comuna = EXCLUDED.comuna,
        region = EXCLUDED.region,
        fecha_inscripcion = EXCLUDED.fecha_inscripcion,
        correo = COALESCE(EXCLUDED.correo, organizaciones_validadas.correo),
        fecha_actualizacion = now()
    RETURNING (xmax = 0) AS insertado
""")


def _normalizar_encabezado(valor) -> str:
    sin_tildes = unicodedata.normalize("NFKD", str(valor or "")).encode("ascii", "ignore").decode()
    return " ".join(sin_tildes.upper().split())


def _texto(valor) -> str | None:
    if valor is None:
        return None
    limpio = " ".join(str(valor).split())
    return limpio or None


def _fecha(valor) -> date | None:
    if valor is None or valor == "":
        return None
    if isinstance(valor, datetime):
        return valor.date()
    if isinstance(valor, date):
        return valor
    return datetime.strptime(str(valor).strip(), "%d-%m-%Y").date()


def leer_filas(ruta: Path) -> tuple[list[dict], list[str]]:
    hoja = openpyxl.load_workbook(ruta, read_only=True, data_only=True).worksheets[0]
    filas = hoja.iter_rows(values_only=True)
    encabezados = [_normalizar_encabezado(h) for h in next(filas)]

    indices = {}
    for campo, nombre in COLUMNAS.items():
        if nombre in encabezados:
            indices[campo] = encabezados.index(nombre)
        elif campo in OBLIGATORIAS:
            raise SystemExit(f"Falta la columna obligatoria '{nombre}' en el Excel")

    registros, errores = [], []
    for n_fila, fila in enumerate(filas, start=2):
        if all(v is None or str(v).strip() == "" for v in fila):
            continue
        crudo = {campo: fila[i] for campo, i in indices.items()}
        try:
            rut = int(str(crudo["rut"]).replace(".", "").strip())
            dv = str(crudo["dv"]).strip().upper()
            if calcular_dv(rut) != dv:
                raise ValueError(f"DV incorrecto para RUT {rut}: viene {dv}, corresponde {calcular_dv(rut)}")
            razon_social = _texto(crudo["razon_social"])
            if not razon_social:
                raise ValueError("razón social vacía")
            correo = _texto(crudo.get("correo"))
            if correo:
                correo = correo.lower()
                if not REGEX_CORREO.match(correo):
                    raise ValueError(f"correo inválido: {correo}")
            registros.append({
                "rut": rut,
                "dv": dv,
                "razon_social": razon_social,
                "actividad": _texto(crudo.get("actividad")),
                "unidad_sii": _texto(crudo.get("unidad_sii")),
                "direccion": _texto(crudo.get("direccion")),
                "comuna": _texto(crudo.get("comuna")),
                "region": _texto(crudo.get("region")),
                "fecha_inscripcion": _fecha(crudo.get("fecha_inscripcion")),
                "correo": correo,
            })
        except (ValueError, TypeError) as e:
            errores.append(f"Fila {n_fila}: {e}")

    ruts = [r["rut"] for r in registros]
    duplicados = sorted({r for r in ruts if ruts.count(r) > 1})
    if duplicados:
        errores.append(f"RUT repetidos dentro del Excel: {duplicados}")

    return registros, errores


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("excel", type=Path)
    parser.add_argument("--dry-run", action="store_true", help="Valida el Excel sin escribir en la BD")
    args = parser.parse_args()

    registros, errores = leer_filas(args.excel)
    print(f"Filas válidas: {len(registros)} | con errores: {len(errores)}")
    for e in errores:
        print(f"  ✗ {e}")
    if errores:
        raise SystemExit("No se importó nada: corrige el Excel y vuelve a ejecutar.")

    if args.dry_run:
        print("Dry-run: no se escribió nada en la BD.")
        return

    insertadas = actualizadas = 0
    with engine.begin() as conexion:
        for registro in registros:
            if conexion.execute(SQL_UPSERT, registro).scalar():
                insertadas += 1
            else:
                actualizadas += 1
        total = conexion.execute(text("SELECT count(*) FROM organizaciones_validadas")).scalar()
        sin_correo = conexion.execute(
            text("SELECT count(*) FROM organizaciones_validadas WHERE correo IS NULL")
        ).scalar()

    print(f"Insertadas: {insertadas} | actualizadas: {actualizadas}")
    print(f"Total en la tabla: {total} | sin correo: {sin_correo}")


if __name__ == "__main__":
    main()
