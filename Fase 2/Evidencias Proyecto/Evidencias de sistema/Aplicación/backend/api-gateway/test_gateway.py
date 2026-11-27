"""
Pruebas del API Gateway: 2 unitarias y 5 de integración.

Las de integración llaman al gateway con TestClient. Los microservicios de
destino se simulan (httpx.MockTransport): no hace falta levantarlos.

Uso (desde backend/api-gateway, con el venv activo):
    python -m unittest test_gateway -v
"""
import json
import os
import unittest
from unittest.mock import patch

# Antes de importar la app: valores de prueba (el .env no los reemplaza).
os.environ["JWT_SECRET"] = "clave-solo-para-pruebas"

import httpx
from fastapi.testclient import TestClient
from jose import jwt

import main

_ClienteReal = httpx.AsyncClient


def token_valido():
    return jwt.encode({"sub": "1", "rol": "adoptante"}, main.JWT_SECRET, algorithm="HS256")


class Unitarias(unittest.TestCase):
    def test_token_invalido_se_rechaza(self):
        self.assertEqual(main._validar_token_si_existe("Bearer no-es-un-token").status_code, 401)

    def test_token_valido_o_ausente_pasa(self):
        self.assertIsNone(main._validar_token_si_existe(f"Bearer {token_valido()}"))
        self.assertIsNone(main._validar_token_si_existe(None))


class Integracion(unittest.TestCase):
    def setUp(self):
        self.api = TestClient(main.app)

    def simular_servicios(self, responder):
        def cliente(*args, **kwargs):
            return _ClienteReal(*args, transport=httpx.MockTransport(responder), **kwargs)

        return patch.object(main.httpx, "AsyncClient", cliente)

    def test_reenvia_ruta_parametros_y_cuerpo_al_servicio_correcto(self):
        recibidas = []

        def responder(peticion):
            recibidas.append(peticion)
            return httpx.Response(201, json={"ok": True})

        with self.simular_servicios(responder):
            respuesta = self.api.post("/postulaciones?estado=pendiente", json={"mascota_id": 1})

        self.assertEqual(respuesta.status_code, 201)
        self.assertEqual(str(recibidas[0].url), f"{main.POSTULACIONES_SERVICE_URL}/postulaciones?estado=pendiente")
        self.assertEqual(json.loads(recibidas[0].content), {"mascota_id": 1})

    def test_ruta_desconocida_responde_404(self):
        self.assertEqual(self.api.get("/no-existe").status_code, 404)

    def test_token_invalido_no_llega_al_servicio(self):
        recibidas = []

        def responder(peticion):
            recibidas.append(peticion)
            return httpx.Response(200)

        with self.simular_servicios(responder):
            respuesta = self.api.get("/mascotas", headers={"Authorization": "Bearer no-es-un-token"})

        self.assertEqual(respuesta.status_code, 401)
        self.assertEqual(recibidas, [])

    def test_servicio_caido_responde_503(self):
        def responder(peticion):
            raise httpx.ConnectError("caído", request=peticion)

        with self.simular_servicios(responder):
            self.assertEqual(self.api.get("/mascotas/1").status_code, 503)

    def test_salud_informa_el_servicio_degradado(self):
        def responder(peticion):
            caido = str(peticion.url).startswith(main.MATCHING_SERVICE_URL)
            return httpx.Response(500 if caido else 200)

        with self.simular_servicios(responder):
            salud = self.api.get("/").json()

        self.assertEqual(salud["status"], "degradado")
        self.assertEqual(salud["microservicios"]["matching-service"], "responde con error")
        self.assertEqual(salud["microservicios"]["auth-service"], "ok")


if __name__ == "__main__":
    unittest.main()
