"""
Ejecuta un archivo .sql de migración contra la BD de DATABASE_URL.

Uso (desde backend/auth-service, con el venv activo):
    python scripts/aplicar_migracion.py "<ruta al .sql>"
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from database import engine  # noqa: E402

if len(sys.argv) != 2:
    raise SystemExit(__doc__)

sql = Path(sys.argv[1]).read_text(encoding="utf-8")
with engine.begin() as conexion:
    conexion.exec_driver_sql(sql)
print(f"Migración aplicada: {Path(sys.argv[1]).name}")
