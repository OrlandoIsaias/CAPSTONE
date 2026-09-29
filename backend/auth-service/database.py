import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise RuntimeError(
        "Falta la variable de entorno DATABASE_URL. "
        "Crea un archivo .env en esta carpeta con: DATABASE_URL=postgresql://..."
    )

# pool_recycle (no pool_pre_ping): pre_ping agrega un round-trip extra de
# verificación en CADA checkout de conexión, antes incluso de la consulta
# real — con una BD remota (Neon) eso cuesta ~150-300ms en cada request.
# pool_recycle logra casi lo mismo (evita usar una conexión demasiado vieja)
# sin ese costo por request: solo descarta y renueva una conexión cuando
# supera este tiempo, no en cada uso.
engine = create_engine(DATABASE_URL, pool_recycle=270)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()