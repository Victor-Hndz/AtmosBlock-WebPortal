"""ALG-308: métricas de invariancia a la resolución (docs/invariancia_resolucion.md §4-§5) sobre salidas sintéticas."""
import os
import sys
import tempfile
import unittest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import iou_resolucion as iou  # noqa: E402

CABECERA_SEL = "# input_file: x.nc\ntime,latitude,longitude,z,type,cluster,centroid_lat,centroid_lon\n"
CABECERA_FORM = "# input_file: x.nc\ntime,max_id,min1_id,min2_id,type\n"


def ejecucion(raiz, nombre, puntos, formaciones=(), candidatos=None):
    """Escribe <raiz>/<nombre>/{normal,candidatos}/ con puntos (t, lat, lon, tipo, cluster) y formaciones (t, max, tipo)."""
    base = os.path.join(raiz, nombre)
    for sub, filas in (("normal", puntos), ("candidatos", candidatos if candidatos is not None else puntos)):
        os.makedirs(os.path.join(base, sub))
        with open(os.path.join(base, sub, "z_selected_x.csv"), "w") as f:
            f.write(CABECERA_SEL)
            for t, lat, lon, tipo, clus in filas:
                f.write(f"{t},{lat:.2f},{lon:.2f},5500.0,{tipo},{clus},{lat:.2f},{lon:.2f}\n")
        with open(os.path.join(base, sub, "z_formations_x.csv"), "w") as f:
            f.write(CABECERA_FORM)
            for t, max_id, tipo in formaciones:
                f.write(f"{t},{max_id},-1,-1,{tipo}\n")
    return iou.leer_ejecucion(base)


class TestIoU(unittest.TestCase):
    def setUp(self):
        self.dir = tempfile.TemporaryDirectory()
        self.raiz = self.dir.name

    def tearDown(self):
        self.dir.cleanup()

    def test_identicas_dan_uno(self):
        puntos = [(0, 45, 0, "MAX", 0), (0, 45, 1, "MAX", 0), (0, 80, 10, "MIN", 1)]
        a = ejecucion(self.raiz, "a", puntos, [(0, 0, "OMEGA")])
        b = ejecucion(self.raiz, "b", puntos, [(0, 0, "OMEGA")])
        r = iou.comparar(a, b)
        self.assertAlmostEqual(r["clusters"]["MAX"]["total"]["iou"], 1.0)
        self.assertAlmostEqual(r["clusters"]["MIN"]["75-90"]["iou"], 1.0)
        self.assertAlmostEqual(r["formaciones"]["bloqueo"]["total"]["iou"], 1.0)
        self.assertEqual(r["formaciones"]["objetos"]["confusion"], {("OMEGA", "OMEGA"): 1})
        self.assertEqual(r["formaciones"]["objetos"]["emparejados_ref"], 1.0)

    def test_solape_parcial_y_banda(self):
        a = ejecucion(self.raiz, "a", [(0, 45, 0, "MAX", 0), (0, 45, 1, "MAX", 0)])
        b = ejecucion(self.raiz, "b", [(0, 45, 1, "MAX", 3), (0, 45, 2, "MAX", 3)])
        r = iou.comparar(a, b)
        self.assertAlmostEqual(r["clusters"]["MAX"]["30-50"]["iou"], 1 / 3)
        self.assertIsNone(r["clusters"]["MAX"]["50-75"]["iou"])  # unión vacía
        obj = r["clusters"]["objetos"]["MAX"]
        self.assertEqual((obj["emparejados_ref"], obj["divisiones"], obj["fusiones"]), (0.0, 0, 0))

    def test_por_debajo_de_30_no_cuenta(self):
        a = ejecucion(self.raiz, "a", [(0, 25, 0, "MAX", 0), (0, 45, 0, "MAX", 0)])
        b = ejecucion(self.raiz, "b", [(0, 45, 0, "MAX", 0)])
        self.assertAlmostEqual(iou.comparar(a, b)["clusters"]["MAX"]["total"]["iou"], 1.0)

    def test_polo_es_un_punto(self):
        a = ejecucion(self.raiz, "a", [(0, 90, 0, "MAX", 0)])
        b = ejecucion(self.raiz, "b", [(0, 90, 7, "MAX", 0), (0, 90, -120, "MAX", 0)])
        r = iou.comparar(a, b)
        self.assertAlmostEqual(r["clusters"]["MAX"]["75-90"]["iou"], 1.0)

    def test_pesos_por_area(self):
        # IoU ponderado: 45° y 80° no pesan lo mismo, así que 1 de 2 puntos no da 0,5.
        a = ejecucion(self.raiz, "a", [(0, 45, 0, "MAX", 0), (0, 80, 0, "MAX", 0)])
        b = ejecucion(self.raiz, "b", [(0, 45, 0, "MAX", 0)])
        esperado = iou.peso(45) / (iou.peso(45) + iou.peso(80))
        self.assertAlmostEqual(iou.comparar(a, b)["clusters"]["MAX"]["total"]["iou"], esperado)
        self.assertAlmostEqual(iou.peso(90), 2 * 3.141592653589793 * iou.R**2 * (1 - iou.math.cos(iou.math.radians(0.5))))

    def test_division_y_desempate(self):
        ref = [(0, 50, lon, "MAX", 0) for lon in range(4)]
        deg = [(0, 50, 0, "MAX", 5), (0, 50, 1, "MAX", 5), (0, 50, 2, "MAX", 2), (0, 50, 3, "MAX", 2)]
        r = iou.comparar(ejecucion(self.raiz, "a", ref), ejecucion(self.raiz, "b", deg))
        obj = r["clusters"]["objetos"]["MAX"]
        self.assertEqual(obj["divisiones"], 1)
        self.assertEqual(obj["fusiones"], 0)
        self.assertEqual(obj["emparejados_ref"], 1.0)  # IoU exactamente 0,5 empareja
        self.assertEqual(obj["emparejados_deg"], 0.5)
        self.assertEqual(obj["pares"], [(0, 0, 2)])  # empate a 0,5: gana el menor id degradado

    def test_candidatos_de_su_ejecucion(self):
        a = ejecucion(self.raiz, "a", [(0, 45, 0, "MAX", 0)], candidatos=[(0, 45, 0, "MAX", 0), (0, 46, 0, "MAX", 0)])
        b = ejecucion(self.raiz, "b", [(0, 45, 0, "MAX", 0)], candidatos=[(0, 45, 0, "MAX", 0)])
        r = iou.comparar(a, b)
        self.assertLess(r["candidatos"]["MAX"]["total"]["iou"], 1.0)
        self.assertAlmostEqual(r["clusters"]["MAX"]["total"]["iou"], 1.0)

    def test_persistencia_desfase(self):
        puntos = [(0, 45, 0, "MAX", 0), (1, 45, 0, "MAX", 0), (1, 45, 1, "MAX", 0), (2, 45, 5, "MAX", 0)]
        a = ejecucion(self.raiz, "a", puntos)
        r = iou.comparar(a, a, desfase=1)
        # pares (0,1): 1 de 2 puntos a la misma latitud; (1,2): 0 de 3.
        self.assertAlmostEqual(r["clusters"]["MAX"]["total"]["iou"], 1 / 5)

    def test_por_paso_y_bootstrap(self):
        puntos = [(t, 45, 0, "MAX", 0) for t in range(20)]
        a = ejecucion(self.raiz, "a", puntos)
        r = iou.comparar(a, a, pasos_bloque=4)
        total = r["clusters"]["MAX"]["total"]
        self.assertEqual((total["mediana_paso"], total["p10_paso"], total["pasos"]), (1.0, 1.0, 20))
        self.assertEqual(total["ic95"], (1.0, 1.0))
        self.assertEqual(r, iou.comparar(a, a, pasos_bloque=4))  # determinista


class TestControles(unittest.TestCase):
    """Adenda §8: dominio 30-75° con 75 incluido, perímetro, δ_eff, fracción marcada e IoU por azar."""

    R1 = iou.R * iou.math.radians(1)

    def cos(self, grados):
        return iou.math.cos(iou.math.radians(grados))

    def setUp(self):
        self.dir = tempfile.TemporaryDirectory()
        self.raiz = self.dir.name

    def tearDown(self):
        self.dir.cleanup()

    def test_dominio_30_75_incluye_75(self):
        a = ejecucion(self.raiz, "a", [(0, 75, 0, "MAX", 0), (0, 45, 0, "MAX", 0)])
        b = ejecucion(self.raiz, "b", [(0, 45, 0, "MAX", 0)])
        r = iou.comparar(a, b)["clusters"]["MAX"]
        self.assertAlmostEqual(r["30-75"]["iou"], iou.peso(45) / (iou.peso(45) + iou.peso(75)))
        self.assertIsNone(r["50-75"]["iou"])  # la partición de §5 no cambia: 75° va a 75-90

    def test_perimetro(self):
        total = iou.DOMINIOS["total"]
        lados = self.cos(44.5) + self.cos(45.5)
        self.assertAlmostEqual(iou.perimetro({(45, 0)}, total), self.R1 * (2 + lados))
        self.assertAlmostEqual(iou.perimetro({(45, 0), (45, 1)}, total), self.R1 * (2 + 2 * lados))
        self.assertAlmostEqual(iou.perimetro({(90, 0)}, total), 360 * self.R1 * self.cos(89.5))
        self.assertAlmostEqual(iou.perimetro({(89, 5), (90, 0)}, total), self.R1 * (2 + self.cos(88.5)) + 359 * self.R1 * self.cos(89.5))
        # El recorte del dominio no es borde: a 30° no cuenta la arista con 29°.
        self.assertAlmostEqual(iou.perimetro({(30, 0)}, total), self.R1 * (2 + self.cos(30.5)))

    def test_vuelta_en_longitud(self):
        total = iou.DOMINIOS["total"]
        lados = self.cos(44.5) + self.cos(45.5)
        self.assertAlmostEqual(iou.perimetro({(45, -180), (45, 179)}, total), self.R1 * (2 + 2 * lados))

    def test_delta_fraccion_azar(self):
        a = ejecucion(self.raiz, "a", [(0, 45, 0, "MAX", 0)])
        b = ejecucion(self.raiz, "b", [(0, 45, 1, "MAX", 0)])
        m = iou.comparar(a, b)["clusters"]["MAX"]["total"]
        p = self.R1 * (2 + self.cos(44.5) + self.cos(45.5))
        self.assertAlmostEqual(m["delta_eff_km"], 2 * iou.peso(45) / p)
        dominio = sum(360 * iou.peso(lat) for lat in range(30, 90)) + iou.peso(90)
        self.assertAlmostEqual(m["fraccion"], iou.peso(45) / dominio)
        self.assertAlmostEqual(m["azar"], m["fraccion"] / (2 - m["fraccion"]))

    def test_sin_diferencias_delta_cero(self):
        a = ejecucion(self.raiz, "a", [(0, 45, 0, "MAX", 0)])
        self.assertEqual(iou.comparar(a, a)["clusters"]["MAX"]["total"]["delta_eff_km"], 0.0)


if __name__ == "__main__":
    unittest.main()
