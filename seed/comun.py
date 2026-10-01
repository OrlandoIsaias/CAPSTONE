import os
from pathlib import Path

from dotenv import load_dotenv
from sqlalchemy import create_engine

RAIZ = Path(__file__).resolve().parent
CSV_MASCOTAS = RAIZ / "salida" / "mascotas.csv"


def motor():
    load_dotenv(RAIZ.parent / "backend" / "auth-service" / ".env")
    url = os.getenv("DATABASE_URL")
    if not url:
        raise SystemExit("Falta DATABASE_URL (se lee de backend/auth-service/.env)")
    return create_engine(url)
