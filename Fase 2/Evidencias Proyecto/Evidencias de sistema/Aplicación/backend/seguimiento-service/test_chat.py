"""
Pruebas del chat de seguimiento: plazos de las encuestas (encuestas.py),
archivos en Cloudinary (medios.py) y validación de mensajes (schemas.py).
Sin BD ni dependencias extra.

Uso (desde backend/seguimiento-service, con el venv activo):
    python -m unittest test_chat -v
"""
import hashlib
import unittest
from datetime import datetime, timedelta

import encuestas
import medios
from schemas import MensajeCrear

AHORA = datetime(2026, 12, 1, 12, 0)


def estados(resultados=None, dias_desde_adopcion=None, mascota_estado="adoptada", sin_espera=False):
    fecha = AHORA - timedelta(days=dias_desde_adopcion) if dias_desde_adopcion is not None else None
    return {e.dias: e for e in encuestas.calcular(resultados or {}, fecha, mascota_estado, AHORA, sin_espera)}


class Encuestas(unittest.TestCase):
    def test_recien_adoptada_ninguna_disponible(self):
        e = estados(dias_desde_adopcion=5)
        self.assertEqual(e[30].estado, "pendiente")
        self.assertEqual(e[90].estado, "pendiente")
        self.assertEqual(e[30].disponible_desde, AHORA + timedelta(days=25))

    def test_a_los_30_dias_solo_la_primera(self):
        e = estados(dias_desde_adopcion=30)
        self.assertEqual(e[30].estado, "disponible")
        self.assertEqual(e[90].estado, "pendiente")

    def test_a_los_90_dias_ambas(self):
        e = estados(dias_desde_adopcion=95)
        self.assertEqual(e[30].estado, "disponible")
        self.assertEqual(e[90].estado, "disponible")

    def test_sin_adopcion_confirmada_ninguna(self):
        e = estados(mascota_estado="en_proceso")
        self.assertEqual(e[30].estado, "pendiente")
        self.assertEqual(e[90].estado, "pendiente")

    def test_sin_espera_solo_para_pruebas(self):
        e = estados(dias_desde_adopcion=1, sin_espera=True)
        self.assertEqual(e[30].estado, "disponible")
        self.assertEqual(e[90].estado, "disponible")

    def test_sin_espera_igual_exige_adopcion_confirmada(self):
        e = estados(mascota_estado="en_proceso", sin_espera=True)
        self.assertEqual(e[30].estado, "pendiente")

    def test_adopcion_anterior_a_la_migracion_queda_abierta(self):
        # Sin fecha_adopcion no hay desde dónde contar los días.
        e = estados(mascota_estado="adoptada")
        self.assertEqual(e[30].estado, "disponible")
        self.assertIsNone(e[30].disponible_desde)

    def test_respondida_muestra_resultado(self):
        e = estados({30: "exitosa"}, dias_desde_adopcion=40)
        self.assertEqual(e[30].estado, "respondida")
        self.assertEqual(e[30].resultado, "exitosa")
        self.assertEqual(e[90].estado, "pendiente")

    def test_tras_una_devolucion_no_se_abren_mas(self):
        # Tras devolverla, la mascota vuelve a "disponible": se cuenta desde fecha_adopcion.
        e = estados({30: "devuelta"}, dias_desde_adopcion=100, mascota_estado="disponible")
        self.assertEqual(e[90].estado, "pendiente")

    def test_resumen_de_devolucion_lleva_el_motivo(self):
        texto = encuestas.resumen(30, "devuelta", "  alergia en la familia ")
        self.assertEqual(texto, "Encuesta de 30 días: la mascota fue devuelta. Motivo: alergia en la familia")
        self.assertLessEqual(len(encuestas.resumen(90, "devuelta", "x" * 5000)), 2000)


class Archivos(unittest.TestCase):
    def test_archivo_dentro_de_la_carpeta_del_chat(self):
        self.assertTrue(medios.pertenece_al_chat("housefound/seguimiento/5/abc123", 5))

    def test_archivo_de_otro_chat_o_carpeta(self):
        self.assertFalse(medios.pertenece_al_chat("housefound/seguimiento/55/abc", 5))
        self.assertFalse(medios.pertenece_al_chat("housefound/mascotas/abc", 5))
        self.assertFalse(medios.pertenece_al_chat("housefound/seguimiento/5/sub/abc", 5))
        self.assertFalse(medios.pertenece_al_chat("housefound/seguimiento/5/../6/abc", 5))
        self.assertFalse(medios.pertenece_al_chat("housefound/seguimiento/5/", 5))

    def test_firma_segun_el_formato_de_cloudinary(self):
        medios.API_SECRET, medios.API_KEY, medios.CLOUD_NAME = "secreto", "clave", "nube"
        firma = medios.firmar_subida(7)
        esperada = hashlib.sha1(
            f"folder=housefound/seguimiento/7&timestamp={firma['timestamp']}secreto".encode()
        ).hexdigest()
        self.assertEqual(firma["signature"], esperada)
        self.assertEqual(firma["folder"], "housefound/seguimiento/7")

    def test_urls_en_formatos_que_reproduce_cualquier_celular(self):
        self.assertTrue(medios.url_de("audio", "c/x").endswith("/video/upload/c/x.mp3"))
        self.assertTrue(medios.url_de("video", "c/x").endswith("/c/x.mp4"))
        self.assertIn("/image/upload/", medios.url_de("imagen", "c/x"))
        self.assertTrue(medios.miniatura_de("video", "c/x").endswith(".jpg"))
        self.assertIsNone(medios.miniatura_de("imagen", "c/x"))
        self.assertIsNone(medios.url_de("texto", None))


class Mensajes(unittest.TestCase):
    def test_texto_vacio_rechazado(self):
        with self.assertRaises(ValueError):
            MensajeCrear(tipo="texto", texto="   ")

    def test_archivo_sin_public_id_rechazado(self):
        for tipo in ("imagen", "audio", "video"):
            with self.assertRaises(ValueError):
                MensajeCrear(tipo=tipo)

    def test_texto_con_archivo_rechazado(self):
        with self.assertRaises(ValueError):
            MensajeCrear(tipo="texto", texto="hola", media_public_id="x")

    def test_encuesta_no_se_envia_a_mano(self):
        with self.assertRaises(ValueError):
            MensajeCrear(tipo="encuesta", texto="Encuesta de 30 días: la adopción va bien.")

    def test_texto_se_limpia(self):
        self.assertEqual(MensajeCrear(tipo="texto", texto="  hola  ").texto, "hola")


if __name__ == "__main__":
    unittest.main()
