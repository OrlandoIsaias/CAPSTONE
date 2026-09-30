"""
Crea una cuenta de refugio PENDIENTE (sin contraseña) por cada organización de
la nómina que aún no tenga refugio, y opcionalmente liga refugios existentes a
una organización.

Uso (desde backend/auth-service, con el venv activo):
    python scripts/crear_refugios.py [--vincular REFUGIO_ID:RUT ...] [--dry-run]

--vincular 10:11111111  liga el refugio 10 a la organización con RUT 11111111.
                        Si la organización no tiene correo, se le copia el del
                        usuario del refugio (así el código le llega a ese correo).

Idempotente: las organizaciones que ya tienen refugio se omiten. Todo o nada.
"""
import argparse
import sys
from pathlib import Path

from sqlalchemy import text

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from database import engine  # noqa: E402


def vincular(conexion, refugio_id: int, rut: int) -> str:
    org = conexion.execute(
        text("SELECT id, razon_social, correo FROM organizaciones_validadas WHERE rut = :rut"), {"rut": rut}
    ).one_or_none()
    if org is None:
        raise SystemExit(f"No existe una organización con RUT {rut}")

    refugio = conexion.execute(
        text("""SELECT r.id, r.organizacion_id, r.nombre_refugio, u.email
                FROM refugios r JOIN usuarios u ON u.id = r.usuario_id WHERE r.id = :id"""),
        {"id": refugio_id},
    ).one_or_none()
    if refugio is None:
        raise SystemExit(f"No existe el refugio {refugio_id}")
    if refugio.organizacion_id == org.id:
        return f"Refugio {refugio_id} ya estaba ligado a {org.razon_social}"

    ocupado = conexion.execute(
        text("SELECT id FROM refugios WHERE organizacion_id = :org"), {"org": org.id}
    ).scalar()
    if ocupado is not None:
        raise SystemExit(f"La organización RUT {rut} ya tiene el refugio {ocupado}")
    if refugio.organizacion_id is not None:
        raise SystemExit(f"El refugio {refugio_id} ya está ligado a otra organización")

    conexion.execute(
        text("UPDATE refugios SET organizacion_id = :org WHERE id = :id"), {"org": org.id, "id": refugio_id}
    )
    if org.correo is None and refugio.email:
        conexion.execute(
            text("UPDATE organizaciones_validadas SET correo = :c, fecha_actualizacion = now() WHERE id = :org"),
            {"c": refugio.email.lower(), "org": org.id},
        )
    return f"Refugio {refugio_id} ({refugio.nombre_refugio}) ligado a {org.razon_social} (RUT {rut})"


def crear_pendientes(conexion) -> int:
    organizaciones = conexion.execute(text("""
        SELECT o.id, o.razon_social, o.direccion, o.comuna
        FROM organizaciones_validadas o
        WHERE NOT EXISTS (SELECT 1 FROM refugios r WHERE r.organizacion_id = o.id)
        ORDER BY o.id
    """)).all()

    for org in organizaciones:
        usuario_id = conexion.execute(
            text("""INSERT INTO usuarios (nombre, email, password_hash, rol, estado)
                    VALUES (:nombre, NULL, NULL, 'refugio', 'pendiente') RETURNING id"""),
            {"nombre": org.razon_social},
        ).scalar()
        direccion = ", ".join(p for p in (org.direccion, org.comuna) if p) or None
        conexion.execute(
            text("""INSERT INTO refugios (usuario_id, nombre_refugio, direccion, organizacion_id)
                    VALUES (:u, :nombre, :direccion, :org)"""),
            {"u": usuario_id, "nombre": org.razon_social, "direccion": direccion, "org": org.id},
        )
    return len(organizaciones)


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--vincular", action="append", default=[], metavar="REFUGIO_ID:RUT")
    parser.add_argument("--dry-run", action="store_true", help="Muestra el resultado y deshace todo")
    args = parser.parse_args()

    conexion = engine.connect()
    transaccion = conexion.begin()
    try:
        for par in args.vincular:
            refugio_id, rut = (int(x) for x in par.split(":"))
            print(vincular(conexion, refugio_id, rut))

        creados = crear_pendientes(conexion)
        print(f"Refugios pendientes creados: {creados}")

        resumen = conexion.execute(text("""
            SELECT count(*) AS total,
                   count(*) FILTER (WHERE r.organizacion_id IS NULL) AS sin_organizacion,
                   count(*) FILTER (WHERE u.estado = 'pendiente') AS pendientes,
                   count(*) FILTER (WHERE u.estado = 'activo') AS activos
            FROM refugios r JOIN usuarios u ON u.id = r.usuario_id
        """)).one()
        print(f"Refugios en total: {resumen.total} | activos: {resumen.activos} | "
              f"pendientes: {resumen.pendientes} | sin organización: {resumen.sin_organizacion}")

        if args.dry_run:
            transaccion.rollback()
            print("Dry-run: no se escribió nada en la BD.")
        else:
            transaccion.commit()
    except BaseException:
        transaccion.rollback()
        raise
    finally:
        conexion.close()


if __name__ == "__main__":
    main()
