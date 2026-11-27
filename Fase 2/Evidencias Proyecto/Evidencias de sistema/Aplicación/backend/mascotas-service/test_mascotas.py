"""
Pruebas de mascotas-service: 3 unitarias y 3 de integración.

Las de integración llaman a la API con TestClient sobre una base SQLite en
memoria: nunca tocan la base real. La consulta a auth-service se simula.

Uso (desde backend/mascotas-service, con el venv activo):
    python -m unittest test_mascotas -v
"""
import os
import unittest
from unittest.mock import patch

# Antes de importar la app: valores de prueba (el .env no los reemplaza).
os.environ["DATABASE_URL"] = "sqlite://"
os.environ["JWT_SECRET"] = "clave-solo-para-pruebas"

from fastapi.testclient import TestClient
from jose import jwt
from pydantic import ValidationError
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

import schemas
import security
from database import Base, get_db
from main import app


def ficha(**cambios):
    base = dict(
        nombre="Luna", especie="Perro", edad=3, sexo="hembra", tamano="mediano",
        espacio_minimo_requerido="casa_patio", tolerancia_soledad="2_4h", nivel_energia="medio",
        nivel_experiencia_requerida="medio", temperamento="sociable", nivel_cuidados="ninguno",
    )
    return {**base, **cambios}


class Unitarias(unittest.TestCase):
    def test_perro_exige_tamano(self):
        with self.assertRaises(ValidationError):
            schemas.MascotaIn(**ficha(tamano=None))

    def test_gato_no_guarda_tamano(self):
        self.assertIsNone(schemas.MascotaIn(**ficha(especie="Gato")).tamano)

    def test_cuidados_especiales_exigen_descripcion(self):
        with self.assertRaises(ValidationError):
            schemas.MascotaIn(**ficha(nivel_cuidados="leves", cuidados_especiales="   "))


def token(usuario_id, rol):
    firmado = jwt.encode({"sub": str(usuario_id), "rol": rol}, security.SECRET_KEY, algorithm="HS256")
    return {"Authorization": f"Bearer {firmado}"}


class Integracion(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
        Base.metadata.create_all(self.engine)
        Sesion = sessionmaker(bind=self.engine, autoflush=False)

        def db_de_prueba():
            with Sesion() as db:
                yield db

        app.dependency_overrides[get_db] = db_de_prueba
        self.api = TestClient(app)

    def tearDown(self):
        app.dependency_overrides.clear()
        self.engine.dispose()

    def publicar(self, refugio_id=1):
        with patch("clients.obtener_refugio_id", return_value=refugio_id):
            return self.api.post("/mascotas", json=ficha(), headers=token(10, "refugio"))

    def test_publicar_y_ver_en_el_listado(self):
        creada = self.publicar()
        self.assertEqual(creada.status_code, 201)
        listado = self.api.get("/mascotas").json()
        self.assertEqual([m["id"] for m in listado], [creada.json()["id"]])
        self.assertEqual(listado[0]["estado"], "disponible")

    def test_un_adoptante_no_puede_publicar(self):
        respuesta = self.api.post("/mascotas", json=ficha(), headers=token(30, "adoptante"))
        self.assertEqual(respuesta.status_code, 403)
        self.assertEqual(self.api.get("/mascotas").json(), [])

    def test_otro_refugio_no_puede_cambiar_el_estado(self):
        mascota_id = self.publicar(refugio_id=1).json()["id"]
        with patch("clients.obtener_refugio_id", return_value=2):
            respuesta = self.api.patch(
                f"/mascotas/{mascota_id}/estado", json={"estado": "adoptada"}, headers=token(20, "refugio")
            )
        self.assertEqual(respuesta.status_code, 403)
        self.assertEqual(self.api.get(f"/mascotas/{mascota_id}").json()["estado"], "disponible")


if __name__ == "__main__":
    unittest.main()
