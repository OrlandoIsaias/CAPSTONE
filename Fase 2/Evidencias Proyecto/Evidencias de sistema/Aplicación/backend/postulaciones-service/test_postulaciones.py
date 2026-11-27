"""
Pruebas de postulaciones-service: 3 unitarias y 8 de integración.

Las de integración llaman a la API con TestClient sobre una base SQLite en
memoria: nunca tocan la base real. SQLite ignora SELECT ... FOR UPDATE, así
que no prueban aprobaciones simultáneas. Requiere httpx (pip install httpx==0.28.1).

Uso (desde backend/postulaciones-service, con el venv activo):
    python -m unittest test_postulaciones -v
"""
import os
import unittest
from types import SimpleNamespace

# Antes de importar la app: valores de prueba (el .env no los reemplaza).
os.environ["DATABASE_URL"] = "sqlite://"
os.environ["JWT_SECRET"] = "clave-solo-para-pruebas"

from fastapi import HTTPException
from fastapi.testclient import TestClient
from jose import jwt
from pydantic import ValidationError
from sqlalchemy import create_engine
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.ext.compiler import compiles
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

import models
import schemas
import security
from database import Base, get_db
from main import CAMPOS_CUESTIONARIO, _foto_principal, app


@compiles(JSONB, "sqlite")
def _jsonb_en_sqlite(tipo, compilador, **kw):
    return "JSON"


class Unitarias(unittest.TestCase):
    def test_estado_de_evaluacion_solo_aprobada_o_rechazada(self):
        self.assertEqual(schemas.PostulacionEstadoIn(estado="aprobada").estado, "aprobada")
        with self.assertRaises(ValidationError):
            schemas.PostulacionEstadoIn(estado="pendiente")

    def test_rol_incorrecto_recibe_403(self):
        verificador = security.requerir_rol("refugio")
        with self.assertRaises(HTTPException) as error:
            verificador(security.UsuarioToken(id=1, rol="adoptante"))
        self.assertEqual(error.exception.status_code, 403)

    def test_foto_principal(self):
        normal = SimpleNamespace(url="a.jpg", es_principal=False)
        principal = SimpleNamespace(url="b.jpg", es_principal=True)
        self.assertEqual(_foto_principal(SimpleNamespace(fotos=[normal, principal])), "b.jpg")
        self.assertEqual(_foto_principal(SimpleNamespace(fotos=[normal])), "a.jpg")
        self.assertIsNone(_foto_principal(SimpleNamespace(fotos=[])))


def token(usuario_id, rol):
    firmado = jwt.encode({"sub": str(usuario_id), "rol": rol}, security.SECRET_KEY, algorithm="HS256")
    return {"Authorization": f"Bearer {firmado}"}


class Integracion(unittest.TestCase):
    """Dos adoptantes (usuarios 1 y 2) y un refugio (usuario 3) con una mascota."""

    def setUp(self):
        self.engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
        Base.metadata.create_all(self.engine)
        Sesion = self.Sesion = sessionmaker(bind=self.engine, autoflush=False)

        with Sesion() as db:
            cuestionario = {campo: "x" for campo in CAMPOS_CUESTIONARIO}
            for i in (1, 2):
                db.add(models.Usuario(id=i, nombre=f"Adoptante {i}", email=f"a{i}@example.com"))
                db.add(models.PerfilAdoptante(id=i, usuario_id=i, telefono=f"+56 9 0000 000{i}", **cuestionario))
            db.add(models.Refugio(id=1, usuario_id=3, nombre_refugio="Refugio", telefono_contacto="+56 9 0000 0003"))
            db.add(models.Mascota(id=1, refugio_id=1, nombre="Luna", especie="Perro", estado="disponible"))
            db.commit()

        def db_de_prueba():
            with Sesion() as db:
                yield db

        app.dependency_overrides[get_db] = db_de_prueba
        self.api = TestClient(app)

    def tearDown(self):
        app.dependency_overrides.clear()
        self.engine.dispose()

    def postular(self, usuario_id):
        return self.api.post("/postulaciones", json={"mascota_id": 1}, headers=token(usuario_id, "adoptante"))

    def evaluar(self, postulacion_id, estado):
        return self.api.patch(
            f"/postulaciones/{postulacion_id}/estado", json={"estado": estado}, headers=token(3, "refugio")
        )

    def test_telefonos_solo_con_postulacion_aprobada(self):
        creada = self.postular(1)
        self.assertEqual(creada.status_code, 201)
        self.assertIsNone(creada.json()["adoptante_telefono"])
        self.assertIsNone(creada.json()["refugio_telefono"])

        aprobada = self.evaluar(creada.json()["id"], "aprobada").json()
        self.assertEqual(aprobada["adoptante_telefono"], "+56 9 0000 0001")
        self.assertEqual(aprobada["refugio_telefono"], "+56 9 0000 0003")

    def consultas(self, postulacion_id):
        """La misma postulación vista por las dos listas y por el detalle."""
        return {
            "mias": self.api.get("/postulaciones/mias", headers=token(1, "adoptante")).json()[0],
            "recibidas": self.api.get("/postulaciones/recibidas", headers=token(3, "refugio")).json()[0],
            "detalle": self.api.get(f"/postulaciones/{postulacion_id}", headers=token(3, "refugio")).json(),
        }

    def test_rn04_el_refugio_ve_la_compatibilidad_junto_al_perfil(self):
        with self.Sesion() as db:
            db.add(models.Match(
                id=1, adoptante_id=1, mascota_id=1, score_compatibilidad=0.85, desglose={"version": 2}
            ))
            db.commit()
        postulacion_id = self.postular(1).json()["id"]

        vistas = self.consultas(postulacion_id)
        self.assertEqual(vistas["recibidas"]["score_compatibilidad"], 0.85)
        detalle = vistas["detalle"]
        self.assertEqual(detalle["score_compatibilidad"], 0.85)
        self.assertEqual(detalle["detalle_compatibilidad"], {"version": 2})
        self.assertEqual(detalle["adoptante_nombre"], "Adoptante 1")
        self.assertEqual(detalle["espacio_disponible"], "x")

    def test_rn06_listas_y_detalle_ocultan_telefonos_si_esta_pendiente_o_rechazada(self):
        postulacion_id = self.postular(1).json()["id"]

        def sin_telefonos():
            for nombre, vista in self.consultas(postulacion_id).items():
                with self.subTest(consulta=nombre, estado=vista["estado"]):
                    self.assertIsNone(vista["adoptante_telefono"])
                    self.assertIsNone(vista["refugio_telefono"])

        sin_telefonos()
        rechazada = self.evaluar(postulacion_id, "rechazada").json()
        self.assertEqual(rechazada["estado"], "rechazada")
        self.assertIsNone(rechazada["adoptante_telefono"])
        self.assertIsNone(rechazada["refugio_telefono"])
        sin_telefonos()

    def test_rn06_listas_y_detalle_muestran_telefonos_si_esta_aprobada(self):
        postulacion_id = self.postular(1).json()["id"]
        self.evaluar(postulacion_id, "aprobada")

        for nombre, vista in self.consultas(postulacion_id).items():
            with self.subTest(consulta=nombre):
                self.assertEqual(vista["adoptante_telefono"], "+56 9 0000 0001")
                self.assertEqual(vista["refugio_telefono"], "+56 9 0000 0003")

    def test_aprobar_una_rechaza_las_demas(self):
        primera = self.postular(1).json()["id"]
        segunda = self.postular(2).json()["id"]

        self.assertEqual(self.evaluar(primera, "aprobada").json()["mascota_estado"], "en_proceso")

        otra = self.api.get("/postulaciones/mias", headers=token(2, "adoptante")).json()[0]
        self.assertEqual(otra["estado"], "rechazada")
        self.assertEqual(self.evaluar(segunda, "aprobada").status_code, 409)

    def test_no_permite_dos_postulaciones_pendientes_iguales(self):
        self.assertEqual(self.postular(1).status_code, 201)
        self.assertEqual(self.postular(1).status_code, 409)

    def test_otro_refugio_no_puede_evaluar(self):
        postulacion_id = self.postular(1).json()["id"]
        with self.Sesion() as db:
            db.add(models.Refugio(id=2, usuario_id=4, nombre_refugio="Otro refugio"))
            db.commit()

        respuesta = self.api.patch(
            f"/postulaciones/{postulacion_id}/estado", json={"estado": "aprobada"}, headers=token(4, "refugio")
        )
        self.assertEqual(respuesta.status_code, 403)
        mia = self.api.get("/postulaciones/mias", headers=token(1, "adoptante")).json()[0]
        self.assertEqual(mia["estado"], "pendiente")

    def test_adopcion_se_confirma_solo_despues_de_aprobar(self):
        postulacion_id = self.postular(1).json()["id"]

        def confirmar():
            return self.api.patch(
                f"/postulaciones/{postulacion_id}/confirmar-adopcion", headers=token(3, "refugio")
            )

        self.assertEqual(confirmar().status_code, 409)
        self.evaluar(postulacion_id, "aprobada")
        confirmada = confirmar()
        self.assertEqual(confirmada.status_code, 200)
        self.assertEqual(confirmada.json()["mascota_estado"], "adoptada")


if __name__ == "__main__":
    unittest.main()
