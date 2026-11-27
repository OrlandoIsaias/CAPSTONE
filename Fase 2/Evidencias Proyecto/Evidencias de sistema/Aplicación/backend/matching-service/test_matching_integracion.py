"""
Pruebas de integración de matching-service (3). Llaman a la API con
TestClient sobre una base SQLite en memoria: nunca tocan la base real.

El guardado de matches usa el UPSERT de PostgreSQL; aquí se reemplaza por el
equivalente de SQLite, así que esa sentencia no se prueba contra PostgreSQL.
Requiere httpx (pip install httpx==0.28.1).

Uso (desde backend/matching-service, con el venv activo):
    python -m unittest test_matching_integracion -v
"""
import os
import unittest
from unittest.mock import patch

# Antes de importar la app: valores de prueba (el .env no los reemplaza).
os.environ["DATABASE_URL"] = "sqlite://"
os.environ["JWT_SECRET"] = "clave-solo-para-pruebas"

from fastapi.testclient import TestClient
from jose import jwt
from sqlalchemy import create_engine, text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.dialects.sqlite import insert as sqlite_insert
from sqlalchemy.ext.compiler import compiles
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

import main
import models
import security
from database import Base, get_db


@compiles(JSONB, "sqlite")
def _jsonb_en_sqlite(tipo, compilador, **kw):
    return "JSON"


def token(usuario_id):
    firmado = jwt.encode({"sub": str(usuario_id), "rol": "adoptante"}, security.SECRET_KEY, algorithm="HS256")
    return {"Authorization": f"Bearer {firmado}"}


def mascota(id, nombre, **cambios):
    base = dict(
        refugio_id=1, especie="Perro", tamano="mediano", edad=4, sexo="hembra",
        espacio_minimo_requerido="casa_patio", tolerancia_soledad="2_4h", nivel_energia="medio",
        nivel_experiencia_requerida="medio", temperamento="reservado", convivencia_ninos="todos",
        convive_perros=True, convive_gatos=True, nivel_cuidados="ninguno", estado="disponible",
    )
    return models.Mascota(id=id, nombre=nombre, **{**base, **cambios})


class Integracion(unittest.TestCase):
    """El adoptante (usuario 1) tiene gatos; el usuario 2 no completó el cuestionario."""

    def setUp(self):
        self.engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
        Base.metadata.create_all(self.engine)
        with self.engine.begin() as conexion:
            # En PostgreSQL esta restricción la define el script SQL.
            conexion.execute(text("CREATE UNIQUE INDEX uq_match ON matches (adoptante_id, mascota_id)"))
        self.Sesion = sessionmaker(bind=self.engine, autoflush=False)

        with self.Sesion() as db:
            db.add(models.PerfilAdoptante(
                id=1, usuario_id=1, espacio_disponible="casa_patio", restriccion_vivienda="ninguna",
                horas_sola="2_4h", tiempo_actividad="30_60m", experiencia_previa="basica",
                ambiente_hogar="moderado", ninos_hogar="no", tiene_perros=False, tiene_gatos=True,
                alergias="ninguna", acepta_cuidados="leves",
            ))
            db.add(models.PerfilAdoptante(id=2, usuario_id=2))
            db.add(mascota(1, "Compatible"))
            db.add(mascota(2, "No convive con gatos", convive_gatos=False))
            db.commit()

        def db_de_prueba():
            with self.Sesion() as db:
                yield db

        main.app.dependency_overrides[get_db] = db_de_prueba
        self.upsert = patch.object(main, "pg_insert", sqlite_insert)
        self.upsert.start()
        self.api = TestClient(main.app)

    def tearDown(self):
        self.upsert.stop()
        main.app.dependency_overrides.clear()
        self.engine.dispose()

    def recomendar(self, usuario_id=1, parametros=""):
        return self.api.get(f"/matching/recomendaciones{parametros}", headers=token(usuario_id))

    def test_incompatible_no_se_recomienda_pero_se_ve_al_explorar(self):
        recomendadas = self.recomendar()
        self.assertEqual(recomendadas.status_code, 200)
        self.assertEqual([r["nombre"] for r in recomendadas.json()], ["Compatible"])

        exploradas = self.recomendar(parametros="?explorar=true").json()
        self.assertEqual([r["excluida"] for r in exploradas], [False, True])
        self.assertEqual(exploradas[1]["motivos_exclusion"][0]["codigo"], "convive_gatos")

    def test_recalcular_no_duplica_los_matches(self):
        self.recomendar()
        self.recomendar()
        with self.Sesion() as db:
            self.assertEqual(db.query(models.Match).count(), 2)

    def test_sin_cuestionario_completo_no_hay_recomendaciones(self):
        self.assertEqual(self.recomendar(usuario_id=2).status_code, 400)


if __name__ == "__main__":
    unittest.main()
