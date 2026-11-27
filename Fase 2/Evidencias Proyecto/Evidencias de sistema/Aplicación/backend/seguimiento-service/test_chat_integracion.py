"""
Pruebas de integración de seguimiento-service (4). Llaman a la API con
TestClient sobre una base SQLite en memoria: nunca tocan la base real ni
Cloudinary. Requiere httpx (pip install httpx==0.28.1).

Uso (desde backend/seguimiento-service, con el venv activo):
    python -m unittest test_chat_integracion -v
"""
import os
import unittest
from datetime import datetime, timedelta

# Antes de importar la app: valores de prueba (el .env no los reemplaza).
os.environ["DATABASE_URL"] = "sqlite://"
os.environ["JWT_SECRET"] = "clave-solo-para-pruebas"
os.environ["SEGUIMIENTO_SIN_ESPERA"] = "false"

from fastapi.testclient import TestClient
from jose import jwt
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

import models
import security
from database import Base, get_db
from main import app


def token(usuario_id, rol):
    firmado = jwt.encode({"sub": str(usuario_id), "rol": rol}, security.SECRET_KEY, algorithm="HS256")
    return {"Authorization": f"Bearer {firmado}"}


ADOPTANTE = token(1, "adoptante")
REFUGIO = token(2, "refugio")
OTRO_ADOPTANTE = token(3, "adoptante")


class Integracion(unittest.TestCase):
    """Una postulación aprobada, con la adopción confirmada hace 31 días."""

    def setUp(self):
        self.engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
        Base.metadata.create_all(self.engine)
        self.Sesion = sessionmaker(bind=self.engine, autoflush=False)

        with self.Sesion() as db:
            db.add_all([
                models.Usuario(id=1, nombre="Ana", rol="adoptante"),
                models.Usuario(id=2, nombre="Refugio", rol="refugio"),
                models.Usuario(id=3, nombre="Otra persona", rol="adoptante"),
                models.PerfilAdoptante(id=1, usuario_id=1),
                models.PerfilAdoptante(id=2, usuario_id=3),
                models.Refugio(id=1, usuario_id=2, nombre_refugio="Refugio"),
                models.Mascota(id=1, refugio_id=1, nombre="Luna", estado="adoptada"),
                models.Postulacion(
                    id=1, adoptante_id=1, mascota_id=1, estado="aprobada",
                    fecha_adopcion=datetime.utcnow() - timedelta(days=31),
                ),
            ])
            db.commit()

        def db_de_prueba():
            with self.Sesion() as db:
                yield db

        app.dependency_overrides[get_db] = db_de_prueba
        self.api = TestClient(app)

    def tearDown(self):
        app.dependency_overrides.clear()
        self.engine.dispose()

    def no_leidos(self, quien):
        return self.api.get("/seguimientos/chats/no-leidos", headers=quien).json()["total"]

    def test_mensaje_llega_al_refugio_y_se_marca_leido(self):
        enviado = self.api.post(
            "/seguimientos/chats/1/mensajes", json={"tipo": "texto", "texto": "Luna está bien"}, headers=ADOPTANTE
        )
        self.assertEqual(enviado.status_code, 201)
        self.assertEqual(self.no_leidos(REFUGIO), 1)
        self.assertEqual(self.no_leidos(ADOPTANTE), 0)

        recibidos = self.api.get("/seguimientos/chats/1/mensajes", headers=REFUGIO).json()
        self.assertEqual(recibidos[0]["texto"], "Luna está bien")
        self.assertFalse(recibidos[0]["es_mio"])

        self.api.patch("/seguimientos/chats/1/leidos", headers=REFUGIO)
        self.assertEqual(self.no_leidos(REFUGIO), 0)

    def test_otra_persona_no_puede_entrar_al_chat(self):
        respuesta = self.api.get("/seguimientos/chats/1/mensajes", headers=OTRO_ADOPTANTE)
        self.assertEqual(respuesta.status_code, 403)

    def test_rn02_encuesta_exitosa_no_marca_la_mascota_como_adoptada(self):
        # Estado forzado para la prueba: con la mascota aún "en_proceso" se ve
        # si la encuesta, por sí sola, la cambia a "adoptada".
        with self.Sesion() as db:
            db.get(models.Mascota, 1).estado = "en_proceso"
            db.commit()

        respuesta = self.api.post("/seguimientos", headers=ADOPTANTE, json={
            "postulacion_id": 1, "dias_transcurridos": 30, "resultado": "exitosa",
        })
        self.assertEqual(respuesta.status_code, 201)
        with self.Sesion() as db:
            self.assertEqual(db.get(models.Mascota, 1).estado, "en_proceso")

    def test_devolucion_libera_la_mascota_y_avisa_en_el_chat(self):
        respuesta = self.api.post("/seguimientos", headers=ADOPTANTE, json={
            "postulacion_id": 1, "dias_transcurridos": 30,
            "resultado": "devuelta", "motivo_devolucion": "alergia",
        })
        self.assertEqual(respuesta.status_code, 201)
        with self.Sesion() as db:
            self.assertEqual(db.get(models.Mascota, 1).estado, "disponible")

        aviso = self.api.get("/seguimientos/chats/1/mensajes", headers=REFUGIO).json()[0]
        self.assertEqual(aviso["tipo"], "encuesta")
        self.assertIn("alergia", aviso["texto"])


if __name__ == "__main__":
    unittest.main()
