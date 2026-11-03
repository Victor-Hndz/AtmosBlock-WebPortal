"""F5 y F5-V1: discrepancia entre el catálogo continuo de la climatología y la verdad por ventanas, sin red.

Uso: python prediccion/verificacion/test_discrepancia.py
"""
import pathlib
import sys
import unittest

import numpy as np

AQUI = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(AQUI))
import discrepancia  # noqa: E402
import test_verdad as tv  # noqa: E402


class Metricas(unittest.TestCase):
    def test_frecuencias_desacuerdo_y_error_de_referencia(self):
        cat, ven = np.array([1, 1, 0, 0]), np.array([1, 0, 1, 0])
        m = discrepancia.metricas(cat, ven, np.full(4, 0.5), ven.astype(float), np.array([2000, 2000, 2001, 2001]))
        self.assertEqual((m["n"], m["f_catalogo"], m["f_ventanas"], m["sesgo"]), (4, 0.5, 0.5, 0.0))
        self.assertEqual((m["cat1_ven0"], m["cat0_ven1"]), (0.25, 0.25))
        self.assertEqual(m["error_referencia"], 0.25)  # BS(0,5; o) − BS(o; o)
        self.assertEqual(m["sd_sesgo_entre_anios"], round(float(np.std([-0.5, 0.5], ddof=1)), 6))

    def test_estrato_vacio(self):
        self.assertEqual(discrepancia.metricas(*(np.empty(0),) * 5), {"n": 0})


class Pares(unittest.TestCase):
    def test_un_bloqueo_dentro_de_todas_las_ventanas_no_discrepa(self):
        # 26 días; bloqueo del 8 al 15: cabe entero en la ventana [d−4, d+15] de las 7 pasadas posibles (d = 4…10).
        # Además, pares() exige que la calma (A) y la calma-V2 salgan idénticas con los dos métodos.
        z = tv.era5(set(range(8, 16)), geopotencial=False)
        p = discrepancia.pares(z)
        self.assertEqual(len(p["dias"]), 7)
        cat, ven = p["ocupacion"]["catalogo"], p["ocupacion"]["ventanas"]
        np.testing.assert_array_equal(cat, ven)
        ea = discrepancia.NOMBRES.index("EA")
        self.assertTrue(ven[:, ea].any())
        self.assertEqual(ven.shape, (7, len(discrepancia.NOMBRES), 16))


if __name__ == "__main__":
    unittest.main()
