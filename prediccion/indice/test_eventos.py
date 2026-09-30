"""PRD-301: seguimiento y filtro de eventos de bloqueo con el comportamiento de blocktrack v1.1, sin red.

Uso: python prediccion/indice/test_eventos.py
"""
import pathlib
import sys
import unittest

import numpy as np

AQUI = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(AQUI))
import eventos  # noqa: E402

NLAT, NLON = 37, 144  # 0…90°N y −180…177,5° a 2,5°


def fila(lat):
    return int(lat / 2.5)


def col(lon):
    return int((lon + 180) / 2.5)


def serie(dias, bloques):
    """Máscara (dias, 37, 144) con rectángulos [(dia, lat0, lat1, lon0, lon1)], extremos incluidos."""
    m = np.zeros((dias, NLAT, NLON), dtype=np.uint8)
    for d, la0, la1, lo0, lo1 in bloques:
        m[d, fila(la0):fila(la1) + 1, col(lo0):col(lo1) + 1] = 1
    return m


class ReproduceBlocktrack(unittest.TestCase):
    """F3-2: 0 discrepancias con ContourTracking2D + FilterEvents de blocktrack v1.1 (tests/generar_referencia_eventos.py)."""

    ref = np.load(AQUI / "tests/referencia_eventos.npz")

    def comprobar(self, caso):
        forma = tuple(self.ref[caso + "_forma"])
        n = int(np.prod(forma))
        dav = np.unpackbits(self.ref[caso + "_dav"])[:n].reshape(forma)
        esperado = np.unpackbits(self.ref[caso + "_eventos"])[:n].reshape(forma).astype(bool)
        obtenido = eventos.eventos(dav)
        self.assertGreater(esperado.sum(), 0)
        self.assertEqual(int((obtenido != esperado).sum()), 0)

    def test_rusia_2010(self):
        self.comprobar("rusia_2010")

    def test_rusia_2010_ventana_de_20_dias(self):
        self.comprobar("rusia_2010_ventana20")

    def test_invierno_1991(self):
        self.comprobar("invierno_1991")


class Filtros(unittest.TestCase):
    GRANDE = (50, 65, 0, 30)  # ~1,5×10⁶ km²

    def test_5_dias_quietos_y_grandes_es_evento(self):
        m = serie(7, [(d, *self.GRANDE) for d in range(1, 6)])
        self.assertTrue(eventos.eventos(m)[1:6].any(axis=(1, 2)).all())

    def test_4_dias_no_es_evento(self):
        m = serie(7, [(d, *self.GRANDE) for d in range(1, 5)])
        self.assertEqual(int(eventos.eventos(m).sum()), 0)

    def test_pequeno_no_es_evento(self):
        m = serie(7, [(d, 60, 62.5, 0, 5) for d in range(7)])  # 6 celdas, ~2×10⁵ km²
        self.assertEqual(int(eventos.eventos(m).sum()), 0)

    def test_rapido_no_es_evento(self):
        # 25° de longitud al día a 57,5°N: ~1500 km/día (~1250 con la media de blocktrack, dist/días); solape 11/21
        m = serie(6, [(d, 50, 65, 25 * d, 25 * d + 50) for d in range(6)])
        self.assertEqual(int(eventos.eventos(m).sum()), 0)

    def test_periodico_en_longitud(self):
        # dos mitades a cada lado de ±180°: < 5×10⁵ km² por separado (9 y 12 celdas), un evento juntas (21)
        m = serie(6, [(d, 55, 60, 172.5, 177.5) for d in range(6)] + [(d, 55, 60, -180, -172.5) for d in range(6)])
        self.assertEqual(int(eventos.eventos(m).sum()), int(m.sum()))

    def test_no_modifica_la_entrada(self):
        m = serie(7, [(d, *self.GRANDE) for d in range(1, 6)])
        copia = m.copy()
        eventos.eventos(m)
        np.testing.assert_array_equal(m, copia)


if __name__ == "__main__":
    unittest.main()
