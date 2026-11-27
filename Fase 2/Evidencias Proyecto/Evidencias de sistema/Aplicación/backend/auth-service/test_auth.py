"""
Pruebas de auth-service: RUT (rut.py), contraseñas y JWT (security.py),
bloqueo por intentos fallidos (rate_limit.py) y validación de los datos
de entrada (schemas.py). Sin BD real ni servicios externos: las variables
de entorno de abajo son valores falsos solo para las pruebas, y la consulta
del usuario se reemplaza por una BD simulada en memoria.

Uso (desde backend/auth-service, con el venv activo):
    python -m unittest test_auth -v
"""
import os

# Antes de importar security/database: valores de prueba, nunca los del .env.
os.environ["JWT_SECRET"] = "clave-solo-para-pruebas-unitarias"
os.environ["DATABASE_URL"] = "postgresql://prueba:prueba@localhost:5432/prueba"

import base64
import json
import time
import unittest
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace

from fastapi import HTTPException
from fastapi.security import HTTPAuthorizationCredentials
from jose import jwt
from pydantic import ValidationError

import rate_limit
import security
from rut import calcular_dv, parsear_rut
from schemas import (
    PerfilAdoptanteIn,
    PerfilAdoptanteOut,
    PerfilRefugioIn,
    SolicitudCodigoRefugio,
    UsuarioLogin,
    UsuarioRegistro,
)


# ---------- Ayudas ----------

class _Consulta:
    def __init__(self, usuario):
        self._usuario = usuario

    def filter(self, *args):
        return self

    def first(self):
        return self._usuario


class _BDSimulada:
    """Imita db.query(...).filter(...).first() devolviendo un usuario fijo."""

    def __init__(self, usuario=None):
        self._usuario = usuario

    def query(self, *args):
        return _Consulta(self._usuario)


def _credenciales(token: str) -> HTTPAuthorizationCredentials:
    return HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)


def _registro(**cambios) -> dict:
    datos = {
        "nombre": "Ana Pérez",
        "email": "ana@correo.cl",
        "password": "secreta1",
        "rol": "adoptante",
    }
    datos.update(cambios)
    return datos


def _cuestionario(**cambios) -> dict:
    datos = {
        "espacio_disponible": "departamento",
        "restriccion_vivienda": "ninguna",
        "horas_sola": "2_4h",
        "tiempo_actividad": "30_60m",
        "experiencia_previa": "basica",
        "ambiente_hogar": "moderado",
        "ninos_hogar": "no",
        "alergias": "ninguna",
        "acepta_cuidados": "leves",
    }
    datos.update(cambios)
    return datos


# ---------- RUT (módulo 11) ----------

class Rut(unittest.TestCase):
    def test_digito_verificador_conocido(self):
        self.assertEqual(calcular_dv(11111111), "1")  # organización de prueba
        self.assertEqual(calcular_dv(12345678), "5")
        self.assertEqual(calcular_dv(6), "K")   # resto 10 -> K
        self.assertEqual(calcular_dv(14), "0")  # resto 11 -> 0

    def test_acepta_con_puntos_guion_o_sin_nada(self):
        for texto in ("12.345.678-5", "12345678-5", "123456785", " 12.345.678-5 "):
            with self.subTest(texto=texto):
                self.assertEqual(parsear_rut(texto), (12345678, "5"))

    def test_k_minuscula_se_normaliza(self):
        self.assertEqual(parsear_rut("6-k"), (6, "K"))

    def test_digito_verificador_incorrecto_rechazado(self):
        with self.assertRaises(ValueError):
            parsear_rut("12.345.678-4")

    def test_formato_invalido_rechazado(self):
        for texto in ("", "abc", "123456789-5", "12.345.678-X"):
            with self.subTest(texto=texto):
                with self.assertRaises(ValueError):
                    parsear_rut(texto)

    def test_rut_cero_rechazado(self):
        with self.assertRaises(ValueError):
            parsear_rut("0-0")


# ---------- Contraseñas (bcrypt) ----------

class Contrasenas(unittest.TestCase):
    def test_se_guarda_un_hash_y_no_la_contrasena(self):
        hash_ = security.hashear_password("secreta1")
        self.assertNotEqual(hash_, "secreta1")
        self.assertNotIn("secreta1", hash_)
        self.assertTrue(hash_.startswith("$2"))  # formato bcrypt

    def test_verifica_la_correcta_y_rechaza_la_incorrecta(self):
        hash_ = security.hashear_password("secreta1")
        self.assertTrue(security.verificar_password("secreta1", hash_))
        self.assertFalse(security.verificar_password("Secreta1", hash_))

    def test_misma_contrasena_da_hashes_distintos(self):
        # bcrypt agrega una sal aleatoria: dos cuentas con la misma clave
        # no quedan con el mismo hash en la BD.
        self.assertNotEqual(security.hashear_password("secreta1"), security.hashear_password("secreta1"))


# ---------- JWT y roles ----------

class Tokens(unittest.TestCase):
    def setUp(self):
        self.usuario = SimpleNamespace(id=7, rol="adoptante")

    def _token(self, **datos) -> str:
        return security.crear_access_token({"sub": "7", "rol": "adoptante", **datos})

    def _obtener(self, token, usuario="por_defecto"):
        usuario = self.usuario if usuario == "por_defecto" else usuario
        return security.obtener_usuario_actual(_credenciales(token), _BDSimulada(usuario))

    def test_token_lleva_id_y_rol(self):
        payload = jwt.decode(self._token(), security.SECRET_KEY, algorithms=[security.ALGORITHM])
        self.assertEqual(payload["sub"], "7")
        self.assertEqual(payload["rol"], "adoptante")

    def test_token_vence_en_24_horas(self):
        payload = jwt.decode(self._token(), security.SECRET_KEY, algorithms=[security.ALGORITHM])
        segundos = payload["exp"] - time.time()
        self.assertAlmostEqual(segundos, 24 * 3600, delta=60)

    def test_token_valido_devuelve_al_usuario(self):
        self.assertIs(self._obtener(self._token()), self.usuario)

    def test_token_modificado_para_cambiar_el_rol_responde_401(self):
        # Un adoptante edita su token para hacerse pasar por refugio y deja
        # la firma original: la firma ya no corresponde al contenido.
        encabezado, _, firma = self._token().split(".")
        contenido = json.dumps({"sub": "7", "rol": "refugio", "exp": int(time.time()) + 3600})
        contenido_b64 = base64.urlsafe_b64encode(contenido.encode()).rstrip(b"=").decode()
        alterado = f"{encabezado}.{contenido_b64}.{firma}"
        with self.assertRaises(HTTPException) as ctx:
            self._obtener(alterado)
        self.assertEqual(ctx.exception.status_code, 401)

    def test_token_firmado_con_otra_clave_responde_401(self):
        falso = jwt.encode({"sub": "7", "rol": "refugio"}, "otra-clave", algorithm=security.ALGORITHM)
        with self.assertRaises(HTTPException) as ctx:
            self._obtener(falso)
        self.assertEqual(ctx.exception.status_code, 401)

    def test_token_vencido_responde_401(self):
        vencido = jwt.encode(
            {"sub": "7", "rol": "adoptante", "exp": datetime.now(timezone.utc) - timedelta(minutes=1)},
            security.SECRET_KEY,
            algorithm=security.ALGORITHM,
        )
        with self.assertRaises(HTTPException) as ctx:
            self._obtener(vencido)
        self.assertEqual(ctx.exception.status_code, 401)

    def test_token_sin_usuario_responde_401(self):
        sin_sub = jwt.encode({"rol": "adoptante"}, security.SECRET_KEY, algorithm=security.ALGORITHM)
        with self.assertRaises(HTTPException) as ctx:
            self._obtener(sin_sub)
        self.assertEqual(ctx.exception.status_code, 401)

    def test_usuario_borrado_responde_401(self):
        with self.assertRaises(HTTPException) as ctx:
            self._obtener(self._token(), usuario=None)
        self.assertEqual(ctx.exception.status_code, 401)

    def test_adoptante_no_puede_usar_endpoint_de_refugio(self):
        verificador = security.requerir_rol("refugio")
        with self.assertRaises(HTTPException) as ctx:
            verificador(self.usuario)
        self.assertEqual(ctx.exception.status_code, 403)

    def test_rol_correcto_pasa(self):
        verificador = security.requerir_rol("adoptante")
        self.assertIs(verificador(self.usuario), self.usuario)


# ---------- Bloqueo por intentos fallidos ----------

class BloqueoPorIntentos(unittest.TestCase):
    EMAIL = "ana@correo.cl"

    def setUp(self):
        rate_limit._intentos_fallidos.clear()
        rate_limit._bloqueado_hasta.clear()

    def _fallar(self, veces, email=EMAIL):
        for _ in range(veces):
            rate_limit.registrar_intento_fallido(email)

    def test_cuatro_intentos_no_bloquean(self):
        self._fallar(4)
        self.assertIsNone(rate_limit.tiempo_bloqueo_restante(self.EMAIL))

    def test_quinto_intento_bloquea_15_minutos(self):
        self._fallar(5)
        restante = rate_limit.tiempo_bloqueo_restante(self.EMAIL)
        self.assertIsNotNone(restante)
        self.assertAlmostEqual(restante.total_seconds(), 15 * 60, delta=5)

    def test_login_correcto_limpia_los_intentos(self):
        self._fallar(4)
        rate_limit.limpiar_intentos(self.EMAIL)
        self._fallar(1)  # vuelve a contar desde cero
        self.assertIsNone(rate_limit.tiempo_bloqueo_restante(self.EMAIL))

    def test_bloqueo_vencido_libera_la_cuenta(self):
        self._fallar(5)
        rate_limit._bloqueado_hasta[self.EMAIL] = datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(seconds=1)
        self.assertIsNone(rate_limit.tiempo_bloqueo_restante(self.EMAIL))
        self.assertNotIn(self.EMAIL, rate_limit._intentos_fallidos)

    def test_bloqueo_es_por_cuenta(self):
        self._fallar(5)
        self.assertIsNone(rate_limit.tiempo_bloqueo_restante("otra@correo.cl"))


# ---------- Validación de datos de entrada ----------

class Registro(unittest.TestCase):
    def test_contrasena_de_menos_de_6_caracteres_rechazada(self):
        with self.assertRaises(ValidationError):
            UsuarioRegistro(**_registro(password="12345"))
        UsuarioRegistro(**_registro(password="123456"))  # 6 sí se acepta

    def test_email_invalido_rechazado(self):
        with self.assertRaises(ValidationError):
            UsuarioRegistro(**_registro(email="ana.correo.cl"))

    def test_email_se_guarda_en_minusculas(self):
        self.assertEqual(UsuarioRegistro(**_registro(email="Ana@Correo.CL")).email, "ana@correo.cl")
        self.assertEqual(UsuarioLogin(email="Ana@Correo.CL", password="x").email, "ana@correo.cl")

    def test_rol_inexistente_rechazado(self):
        with self.assertRaises(ValidationError):
            UsuarioRegistro(**_registro(rol="admin"))


class Telefono(unittest.TestCase):
    def test_formatos_validos_se_normalizan(self):
        for texto in ("+56 9 1234 5678", "+56912345678", "56912345678", "912345678", "9 1234 5678"):
            with self.subTest(texto=texto):
                self.assertEqual(UsuarioRegistro(**_registro(telefono=texto)).telefono, "+56 9 1234 5678")

    def test_formato_invalido_rechazado(self):
        for texto in ("12345678", "+56 2 1234 5678", "abc"):
            with self.subTest(texto=texto):
                with self.assertRaises(ValidationError):
                    UsuarioRegistro(**_registro(telefono=texto))

    def test_telefono_del_adoptante_es_opcional(self):
        self.assertIsNone(UsuarioRegistro(**_registro(telefono="")).telefono)
        self.assertIsNone(UsuarioRegistro(**_registro()).telefono)

    def test_telefono_del_refugio_es_obligatorio(self):
        with self.assertRaises(ValidationError):
            PerfilRefugioIn(nombre_refugio="Patitas", telefono_contacto="")


class RutDeRefugio(unittest.TestCase):
    def test_rut_se_normaliza_al_ingresar(self):
        solicitud = SolicitudCodigoRefugio(rut="11.111.111-1")
        self.assertEqual(solicitud.rut, "11111111-1")
        self.assertEqual(solicitud.rut_numero, 11111111)

    def test_rut_invalido_rechazado(self):
        with self.assertRaises(ValidationError):
            SolicitudCodigoRefugio(rut="11.111.111-2")


class Cuestionario(unittest.TestCase):
    def test_respuesta_fuera_de_las_opciones_rechazada(self):
        with self.assertRaises(ValidationError):
            PerfilAdoptanteIn(**_cuestionario(horas_sola="10h"))

    def test_especie_imposible_segun_sus_respuestas_rechazada(self):
        casos = (
            {"alergias": "perros", "especie_preferida": "Perro"},
            {"alergias": "ambos", "especie_preferida": "Gato"},
            {"restriccion_vivienda": "solo_gatos", "especie_preferida": "Perro"},
        )
        for caso in casos:
            with self.subTest(**caso):
                with self.assertRaises(ValidationError):
                    PerfilAdoptanteIn(**_cuestionario(**caso))
        PerfilAdoptanteIn(**_cuestionario(alergias="perros", especie_preferida="Gato"))  # posible

    def test_preferencias_sin_repetidos_y_vacia_es_me_da_igual(self):
        perfil = PerfilAdoptanteIn(**_cuestionario(tamanos_preferidos=["pequeno", "pequeno", "mediano"]))
        self.assertEqual(perfil.tamanos_preferidos, ["pequeno", "mediano"])
        self.assertIsNone(PerfilAdoptanteIn(**_cuestionario(etapas_preferidas=[])).etapas_preferidas)

    def test_cuestionario_completo_o_incompleto(self):
        completo = PerfilAdoptanteOut(id=1, usuario_id=7, **_cuestionario())
        self.assertTrue(completo.cuestionario_completo)
        recien_registrado = PerfilAdoptanteOut(id=2, usuario_id=8)
        self.assertFalse(recien_registrado.cuestionario_completo)


if __name__ == "__main__":
    unittest.main()
