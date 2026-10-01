"""PRD-502: puntuaciones de la verificación preregistrada (F5), con casos calculados a mano, sin red.

Uso: python prediccion/verificacion/test_puntuaciones.py
"""
import pathlib
import sys
import unittest

import numpy as np

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import puntuaciones as pu  # noqa: E402


class Brier(unittest.TestCase):
    def test_a_mano(self):
        self.assertAlmostEqual(pu.brier([0.8, 0.2, 0.5], [1, 0, 1]), (0.04 + 0.04 + 0.25) / 3)

    def test_perfecta_y_climatologia(self):
        o = np.array([1, 0, 0, 1])
        self.assertEqual(pu.brier(o, o), 0.0)
        self.assertEqual(pu.bss(pu.brier(np.full(4, 0.5), o), pu.brier(np.full(4, 0.5), o)), 0.0)
        self.assertEqual(pu.bss(0.0, 0.25), 1.0)

    def test_justo_de_ferro_2014(self):
        # i de m miembros: (i/m − y)² − i(m−i)/(m²(m−1))
        self.assertAlmostEqual(pu.brier_justo([3], 5, [1]), (0.6 - 1) ** 2 - 3 * 2 / (25 * 4))
        self.assertAlmostEqual(pu.brier_justo([0, 5], 5, [0, 1]), 0.0)

    def test_justo_insesgado_con_miembros_intercambiables(self):
        # si los miembros y la verdad salen de la misma Bernoulli(q), el BS justo esperado es el de la probabilidad q
        rng = np.random.default_rng(0)
        q, m, n = 0.3, 5, 200000
        k = rng.binomial(m, q, n)
        o = rng.random(n) < q
        self.assertAlmostEqual(pu.brier_justo(k, m, o), q * (1 - q), places=2)
        self.assertGreater(pu.brier(k / m, o), q * (1 - q) + 0.02)


class Murphy(unittest.TestCase):
    def test_descomposicion_exacta_con_un_valor_por_intervalo(self):
        p = np.array([0.05, 0.05, 0.05, 0.45, 0.45, 0.95, 0.95, 0.95, 0.95])
        o = np.array([0, 0, 1, 1, 0, 1, 1, 1, 0])
        rel, res, unc = pu.murphy(p, o)
        self.assertAlmostEqual(rel - res + unc, pu.brier(p, o))
        self.assertAlmostEqual(unc, (5 / 9) * (4 / 9))

    def test_fiabilidad_perfecta(self):
        p = np.repeat([0.25, 0.75], 4)
        o = np.array([1, 0, 0, 0, 1, 1, 1, 0])
        self.assertAlmostEqual(pu.murphy(p, o)[0], 0.0)


class DiagramaFiabilidad(unittest.TestCase):
    def test_intervalos_y_frecuencias(self):
        p = np.array([0.02, 0.08, 0.5, 0.55, 1.0])
        o = np.array([0, 1, 1, 0, 1])
        d = pu.fiabilidad(p, o, n_rep=50)
        np.testing.assert_array_equal(d["n"][[0, 5, 9]], [2, 2, 1])
        self.assertAlmostEqual(d["frecuencia"][0], 0.5)
        self.assertAlmostEqual(d["prob_media"][5], 0.525)
        self.assertTrue(np.isnan(d["frecuencia"][3]))

    def test_barras_de_consistencia_deterministas_y_con_la_diagonal(self):
        rng = np.random.default_rng(1)
        p = rng.random(4000)
        o = rng.random(4000) < p
        a, b = pu.fiabilidad(p, o, n_rep=200, semilla=7), pu.fiabilidad(p, o, n_rep=200, semilla=7)
        np.testing.assert_array_equal(a["barra_inf"], b["barra_inf"])
        dentro = (a["barra_inf"] <= a["prob_media"]) & (a["prob_media"] <= a["barra_sup"])
        self.assertTrue(dentro.all())


class Roc(unittest.TestCase):
    def test_area(self):
        self.assertEqual(pu.area_roc([0.9, 0.8, 0.1, 0.2], [1, 1, 0, 0]), 1.0)
        self.assertEqual(pu.area_roc([0.5] * 4, [1, 0, 1, 0]), 0.5)
        # pares (positivo, negativo): (0.8,0.3) gana, (0.8,0.8) empata, (0.2,0.3) pierde, (0.2,0.8) pierde → 1,5/4
        self.assertEqual(pu.area_roc([0.8, 0.2, 0.3, 0.8], [1, 1, 0, 0]), 0.375)


class Bootstrap(unittest.TestCase):
    def test_bloques_consecutivos_y_semilla(self):
        idx = pu.indices_bloques(40, bloque=16, n_rep=5, semilla=3)
        self.assertEqual(idx.shape, (5, 40))
        np.testing.assert_array_equal(idx, pu.indices_bloques(40, bloque=16, n_rep=5, semilla=3))
        self.assertTrue((np.diff(idx[:, :16], axis=1) == 1).all())  # el primer bloque es seguido
        self.assertTrue(((idx >= 0) & (idx < 40)).all())

    def test_intervalo_y_p_valor(self):
        o = np.array([1, 0] * 50)
        buena, mala = np.where(o == 1, 0.9, 0.1), np.full(100, 0.5)
        reps = pu.bootstrap(lambda a, b, y: pu.brier(b, y) - pu.brier(a, y), buena, mala, o, n_rep=300)
        lo, hi = pu.intervalo(reps)
        self.assertTrue(0 < lo <= hi)  # la diferencia es la misma en cada pasada: intervalo de anchura 0
        self.assertEqual(pu.p_valor(reps), 0.0)
        self.assertEqual(pu.p_valor(np.array([-1.0, 1.0, 2.0, 3.0])), 0.5)


class Fdr(unittest.TestCase):
    def test_benjamini_hochberg(self):
        # q = 0,10, m = 5: umbrales 0,02 0,04 0,06 0,08 0,10; el mayor k con p(k) ≤ umbral es 3
        np.testing.assert_array_equal(pu.fdr([0.01, 0.2, 0.03, 0.05, 0.5], q=0.10), [1, 0, 1, 1, 0])
        np.testing.assert_array_equal(pu.fdr([0.5, 0.6], q=0.10), [0, 0])


if __name__ == "__main__":
    unittest.main()
