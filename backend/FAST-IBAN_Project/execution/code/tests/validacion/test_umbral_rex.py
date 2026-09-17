"""ALG-368: análisis del umbral del Rex (docs/validacion_umbral_rex.md §2) sobre salidas sintéticas."""
import math
import os
import sys
import tempfile
import unittest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import umbral_rex as ur  # noqa: E402

SEL = "# cabecera\ntime,latitude,longitude,z,type,cluster,centroid_lat,centroid_lon\n"
FORM = "# cabecera\ntime,max_id,min1_id,min2_id,type\n"


def ejecucion(raiz, nombre, clusters, formaciones):
    """clusters: (t, id, tipo, lat, lon); formaciones: (t, max, min1, min2, tipo)."""
    d = os.path.join(raiz, nombre)
    os.makedirs(d)
    with open(os.path.join(d, "z_selected_x.csv"), "w") as f:
        f.write(SEL)
        for t, cid, tipo, lat, lon in clusters:
            f.write(f"{t},{lat},{lon},5500.0,{tipo},{cid},{lat},{lon}\n")
    with open(os.path.join(d, "z_formations_x.csv"), "w") as f:
        f.write(FORM)
        for t, mx, m1, m2, tipo in formaciones:
            f.write(f"{t},{mx},{m1},{m2},{tipo}\n")
    return d


class TestUmbralRex(unittest.TestCase):
    def setUp(self):
        self.dir = tempfile.TemporaryDirectory()
        self.raiz = self.dir.name

    def tearDown(self):
        self.dir.cleanup()

    def test_distancia_al_meridiano_como_el_nucleo(self):
        self.assertAlmostEqual(ur.distancia_al_meridiano((50, 10), (60, 0)), 712.6, delta=0.5)
        self.assertAlmostEqual(ur.distancia_al_meridiano((50, -179.5), (60, 179.5)),
                               ur.distancia_al_meridiano((50, 1), (60, 0)), places=6)
        self.assertEqual(ur.distancia_al_meridiano((50, 100), (60, 0)), math.inf)

    def test_marginales_nucleo_continuidad_robustez(self):
        # Paso 0-2: un Rex núcleo continuo y robusto (máx 60N 0E, mín 50N 5E: d ≈ 358 km).
        # Paso 0: un Rex marginal (máx 60N 100E, mín 45N 109,5E: d ≈ 745 km) sin pareja en otros pasos ni a 1°.
        lon_m = 100 + 9.5
        clusters = [(t, 0, "MAX", 60, 0) for t in range(3)] + [(t, 1, "MIN", 50, 5) for t in range(3)] + \
                   [(0, 2, "MAX", 60, 100), (0, 3, "MIN", 45, lon_m)]
        rex_nucleo = [(t, 0, 1, -1, "REX") for t in range(3)]
        d700 = ejecucion(self.raiz, "700", clusters, rex_nucleo)
        d780 = ejecucion(self.raiz, "780", clusters, rex_nucleo + [(0, 2, 3, -1, "REX")])
        d1060 = ejecucion(self.raiz, "1060", clusters, rex_nucleo + [(0, 2, 3, -1, "REX")])
        d1060_1 = ejecucion(self.raiz, "1060_1", [(t, 7, "MAX", 60.5, 0.5) for t in range(3)] + [(t, 8, "MIN", 50, 5) for t in range(3)],
                            [(t, 7, 8, -1, "REX") for t in range(3)])
        r = ur.analizar([(d700, d780, d1060, d1060_1)])
        self.assertAlmostEqual(ur.distancia_al_meridiano((45, lon_m), (60, 100)), 745.2, delta=0.5)
        self.assertEqual((r["n_C"], r["n_M"]), (3, 1))
        self.assertEqual((r["P_C"], r["R_C"]), (1.0, 1.0))
        self.assertEqual((r["P_M"], r["R_M"]), (0.0, 0.0))
        self.assertEqual((r["episodios_C"], r["episodios_M"]), (1, 1))
        self.assertEqual(r["fraccion_M_bajo_35N"], 0.0)

    def test_sustituciones_se_cuentan(self):
        clusters = [(0, 0, "MAX", 60, 0), (0, 1, "MIN", 50, 5), (0, 2, "MIN", 45, 9.5), (0, 3, "MIN", 50, -5)]  # mín 2: d ≈ 745 km
        d700 = ejecucion(self.raiz, "700", clusters, [(0, 0, 1, -1, "REX")])
        d780 = ejecucion(self.raiz, "780", clusters, [(0, 0, 2, -1, "REX")])  # otro mínimo, más lejano
        vacia = ejecucion(self.raiz, "1060", clusters, [])
        vacia1 = ejecucion(self.raiz, "1060_1", clusters, [])
        r = ur.analizar([(d700, d780, vacia, vacia1)])
        self.assertEqual(r["sustituciones"], 1)
        self.assertEqual(r["n_M"], 1)  # d en (700, 780] y sin el mismo par en 700: sí es marginal, además de sustitución

    def test_episodios_y_semestres_separados(self):
        # El mismo Rex en el último paso del semestre 1 y el primero del 2 no forman episodio.
        clusters = [(0, 0, "MAX", 60, 0), (0, 1, "MIN", 50, 5)]
        d = ejecucion(self.raiz, "a", clusters, [(0, 0, 1, -1, "REX")])
        e = ejecucion(self.raiz, "b", clusters, [(0, 0, 1, -1, "REX")])
        r = ur.analizar([(d, d, d, d), (e, e, e, e)])
        self.assertEqual((r["n_C"], r["episodios_C"], r["P_C"]), (2, 2, 0.0))

    def test_regla_de_decision(self):
        base = {"n_M": 40, "episodios_M": 12, "fraccion_M_bajo_35N": 0.1, "ic90_dP": (-0.1, 0.05), "ic90_dR": (-0.12, 0.0)}
        self.assertEqual(ur.decidir(base), "adoptar 780")
        self.assertEqual(ur.decidir({**base, "ic90_dP": (-0.3, -0.16)}), "mantener 700")
        self.assertEqual(ur.decidir({**base, "ic90_dR": (-0.2, 0.0)}), "abierta")
        self.assertEqual(ur.decidir({**base, "n_M": 29}), "abierta")
        self.assertEqual(ur.decidir({**base, "episodios_M": 9}), "abierta")
        self.assertEqual(ur.decidir({**base, "fraccion_M_bajo_35N": 0.25}), "abierta")
        self.assertEqual(ur.decidir({**base, "n_M": 5, "ic90_dR": (-0.4, -0.2)}), "mantener 700")
        self.assertTrue(ur.muestra_suficiente(base))
        self.assertFalse(ur.muestra_suficiente({**base, "episodios_M": 9}))


if __name__ == "__main__":
    unittest.main()
