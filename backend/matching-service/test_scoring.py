"""
Pruebas del motor de matching (scoring.py). Sin BD ni dependencias extra.

Uso (desde backend/matching-service, con el venv activo):
    python -m unittest test_scoring -v
"""
import unittest
from types import SimpleNamespace

from scoring import PESOS, cuestionario_completo, etapa_de_vida, evaluar


def perfil(**cambios):
    base = dict(
        espacio_disponible="casa_patio",
        restriccion_vivienda="ninguna",
        horas_sola="2_4h",
        tiempo_actividad="30_60m",
        experiencia_previa="basica",
        ambiente_hogar="moderado",
        ninos_hogar="no",
        tiene_perros=False,
        tiene_gatos=False,
        alergias="ninguna",
        acepta_cuidados="leves",
        especie_preferida=None,
        tamanos_preferidos=None,
        etapas_preferidas=None,
        sexo_preferido=None,
    )
    return SimpleNamespace(**{**base, **cambios})


def mascota(**cambios):
    base = dict(
        especie="Perro",
        tamano="mediano",
        edad=4,
        sexo="hembra",
        espacio_minimo_requerido="casa_patio",
        tolerancia_soledad="2_4h",
        nivel_energia="medio",
        nivel_experiencia_requerida="medio",
        temperamento="reservado",
        convivencia_ninos="todos",
        convive_perros=True,
        convive_gatos=True,
        nivel_cuidados="ninguno",
    )
    return SimpleNamespace(**{**base, **cambios})


def codigos(motivos):
    return [m.codigo for m in motivos]


class Compatibilidad(unittest.TestCase):
    def test_pesos_suman_uno(self):
        self.assertAlmostEqual(sum(PESOS.values()), 1.0)

    def test_hogar_que_cubre_todo_es_100(self):
        e = evaluar(perfil(), mascota())
        self.assertEqual(e.score, 1.0)
        self.assertEqual(e.exclusiones, [])
        self.assertEqual(e.alertas, [])

    def test_un_nivel_de_brecha_en_soledad_resta_la_mitad_de_su_peso(self):
        e = evaluar(perfil(horas_sola="4_8h"), mascota(tolerancia_soledad="2_4h"))
        self.assertEqual(e.score, round(1 - PESOS["soledad"] * 0.5, 3))

    def test_tener_de_mas_nunca_resta(self):
        # Persona muy activa, en casa casi siempre, con mucha experiencia y
        # parcela, frente a un perro tranquilo, independiente y sociable.
        e = evaluar(
            perfil(horas_sola="menos_2h", tiempo_actividad="mas_60m", experiencia_previa="alta",
                   ambiente_hogar="tranquilo", espacio_disponible="casa_grande"),
            mascota(tolerancia_soledad="mas_8h", nivel_energia="bajo", nivel_experiencia_requerida="bajo",
                    temperamento="sociable", espacio_minimo_requerido="departamento"),
        )
        self.assertEqual(e.score, 1.0)

    def test_brecha_critica_limita_el_total_a_50(self):
        # Quedaría más de 8 h sola y no tolera ni 2 h: sin tope daría 70%.
        e = evaluar(perfil(horas_sola="mas_8h"), mascota(tolerancia_soledad="menos_2h"))
        self.assertEqual(e.score, 0.5)
        self.assertTrue(e.tope_aplicado)

    def test_tope_no_sube_un_score_que_ya_es_bajo(self):
        e = evaluar(
            perfil(horas_sola="mas_8h", tiempo_actividad="menos_30m"),
            mascota(tolerancia_soledad="menos_2h", nivel_energia="alto"),
        )
        self.assertEqual(e.score, 0.45)
        self.assertFalse(e.tope_aplicado)

    def test_mascota_timida_necesita_hogar_tranquilo(self):
        self.assertEqual(evaluar(perfil(ambiente_hogar="tranquilo"), mascota(temperamento="timido")).score, 1.0)
        movido = evaluar(perfil(ambiente_hogar="movido"), mascota(temperamento="timido"))
        self.assertEqual(next(c.puntaje for c in movido.desglose if c.criterio == "ambiente"), 0.0)
        self.assertEqual(evaluar(perfil(ambiente_hogar="movido"), mascota(temperamento="sociable")).score, 1.0)

    def test_desglose_trae_un_criterio_por_peso_con_ambos_valores(self):
        e = evaluar(perfil(), mascota())
        self.assertEqual({c.criterio for c in e.desglose}, set(PESOS))
        soledad = next(c for c in e.desglose if c.criterio == "soledad")
        self.assertEqual((soledad.adoptante, soledad.mascota), ("2_4h", "2_4h"))


class Exclusiones(unittest.TestCase):
    def test_ninos_pequenos(self):
        self.assertEqual(codigos(evaluar(perfil(ninos_hogar="pequenos"), mascota(convivencia_ninos="mayores")).exclusiones),
                         ["ninos_pequenos"])
        self.assertFalse(evaluar(perfil(ninos_hogar="pequenos"), mascota(convivencia_ninos="todos")).excluida)

    def test_ninos_mayores(self):
        self.assertFalse(evaluar(perfil(ninos_hogar="mayores"), mascota(convivencia_ninos="mayores")).excluida)
        self.assertEqual(codigos(evaluar(perfil(ninos_hogar="mayores"), mascota(convivencia_ninos="no")).exclusiones),
                         ["ninos"])

    def test_sin_ninos_no_importa_su_convivencia(self):
        self.assertFalse(evaluar(perfil(ninos_hogar="no"), mascota(convivencia_ninos="no")).excluida)

    def test_otros_animales_se_evaluan_por_especie(self):
        e = evaluar(perfil(tiene_gatos=True), mascota(convive_perros=True, convive_gatos=False))
        self.assertEqual(codigos(e.exclusiones), ["convive_gatos"])
        self.assertFalse(evaluar(perfil(tiene_perros=True), mascota(convive_gatos=False)).excluida)

    def test_alergia_excluye_solo_esa_especie(self):
        self.assertEqual(codigos(evaluar(perfil(alergias="gatos"), mascota(especie="Gato", tamano=None)).exclusiones),
                         ["alergia"])
        self.assertFalse(evaluar(perfil(alergias="gatos"), mascota(especie="Perro")).excluida)
        self.assertTrue(evaluar(perfil(alergias="ambos"), mascota(especie="Perro")).excluida)

    def test_restriccion_de_vivienda(self):
        self.assertEqual(codigos(evaluar(perfil(restriccion_vivienda="solo_gatos"), mascota()).exclusiones),
                         ["vivienda_solo_gatos"])
        self.assertEqual(codigos(evaluar(perfil(restriccion_vivienda="solo_pequenas"), mascota(tamano="mediano")).exclusiones),
                         ["vivienda_solo_pequenas"])
        self.assertFalse(evaluar(perfil(restriccion_vivienda="solo_pequenas"), mascota(tamano="pequeno")).excluida)
        self.assertFalse(evaluar(perfil(restriccion_vivienda="solo_pequenas"), mascota(especie="Gato", tamano=None)).excluida)

    def test_cuidados_que_no_puede_asumir(self):
        self.assertTrue(evaluar(perfil(acepta_cuidados="leves"), mascota(nivel_cuidados="complejos")).excluida)
        self.assertTrue(evaluar(perfil(acepta_cuidados="no"), mascota(nivel_cuidados="leves")).excluida)
        self.assertFalse(evaluar(perfil(acepta_cuidados="leves"), mascota(nivel_cuidados="leves")).excluida)

    def test_la_exclusion_no_cambia_el_porcentaje(self):
        e = evaluar(perfil(tiene_gatos=True), mascota(convive_gatos=False))
        self.assertTrue(e.excluida)
        self.assertEqual(e.score, 1.0)


class Alertas(unittest.TestCase):
    def test_no_evaluado_nunca_excluye(self):
        e = evaluar(perfil(ninos_hogar="pequenos", tiene_perros=True, tiene_gatos=True),
                    mascota(convivencia_ninos=None, convive_perros=None, convive_gatos=None))
        self.assertFalse(e.excluida)
        self.assertEqual(codigos(e.alertas), ["ninos_sin_evaluar", "perros_sin_evaluar", "gatos_sin_evaluar"])

    def test_vivienda_por_confirmar(self):
        self.assertEqual(codigos(evaluar(perfil(restriccion_vivienda="no_se"), mascota()).alertas),
                         ["vivienda_por_confirmar"])


class Preferencias(unittest.TestCase):
    def test_preferencias_no_cambian_el_porcentaje(self):
        e = evaluar(perfil(tamanos_preferidos=["pequeno"], etapas_preferidas=["senior"], sexo_preferido="macho"),
                    mascota(tamano="grande", edad=4, sexo="hembra"))
        self.assertEqual(e.score, 1.0)
        self.assertEqual(e.discrepancias, ["tamano", "etapa", "sexo"])

    def test_tamano_no_aplica_a_gatos(self):
        e = evaluar(perfil(tamanos_preferidos=["pequeno"]), mascota(especie="Gato", tamano=None))
        self.assertEqual(e.discrepancias, [])

    def test_especie(self):
        self.assertFalse(evaluar(perfil(especie_preferida="Gato"), mascota()).coincide_especie)
        self.assertTrue(evaluar(perfil(especie_preferida=None), mascota()).coincide_especie)

    def test_etapas_de_vida(self):
        self.assertEqual([etapa_de_vida(e) for e in (0, 1, 2, 3, 7, 8)],
                         ["cachorro", "joven", "joven", "adulto", "adulto", "senior"])


class Cuestionario(unittest.TestCase):
    def test_completo_e_incompleto(self):
        self.assertTrue(cuestionario_completo(perfil()))
        self.assertFalse(cuestionario_completo(perfil(horas_sola=None)))

    def test_json_guardado_en_matches(self):
        datos = evaluar(perfil(ninos_hogar="pequenos"), mascota(convivencia_ninos="no")).a_json()
        self.assertEqual(set(datos), {"version", "criterios", "exclusiones", "alertas", "discrepancias", "tope_aplicado"})
        self.assertEqual(datos["exclusiones"][0]["codigo"], "ninos_pequenos")


if __name__ == "__main__":
    unittest.main()
