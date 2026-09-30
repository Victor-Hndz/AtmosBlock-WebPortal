"""PRD-503: climatología ERA5 del sector bloqueado y del inicio (preregistro F5 y aclaración de F3-5), sin red.

Uso: python prediccion/verificacion/test_climatologia.py
"""
import pathlib
import sys
import unittest

import numpy as np

AQUI = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(AQUI))
sys.path.insert(0, str(AQUI.parent / "indice"))
import climatologia as cl  # noqa: E402
import eventos  # noqa: E402
import sectores  # noqa: E402

EA = list(sectores.SECTORES).index("EA")


def dav_serie(dias, bloqueados, lat=(55, 62.5), lon=(0, 30)):
    """Máscara DAV (dias, 37, 144) con un bloque grande en EA los días indicados."""
    m = np.zeros((dias, 37, 144), dtype=np.uint8)
    for d in bloqueados:
        m[d, int(lat[0] / 2.5):int(lat[1] / 2.5) + 1, int((lon[0] + 180) / 2.5):int((lon[1] + 180) / 2.5) + 1] = 1
    return m


class Etiquetas(unittest.TestCase):
    def test_etiquetas_filtradas_coinciden_con_eventos(self):
        m = dav_serie(20, list(range(3, 10)) + [14, 15])  # un evento de 7 días y un objeto de 2 que no llega
        et = eventos.etiquetas_filtradas(m)
        np.testing.assert_array_equal(et > 0, eventos.eventos(m))
        self.assertEqual(len(np.unique(et[et > 0])), 1)


class Catalogo(unittest.TestCase):
    def test_censura_por_fecha_de_inicio(self):
        # evento del día 10 al 20: el día 12 cuenta sin censura y con k ≤ 2 (inicio ≤ 12 − k); con k = 3 ya no
        cat = cl.catalogo(dav_serie(30, range(10, 21)))
        b = cat["bloqueado"][:, EA, 12]  # (k, sector, día)
        np.testing.assert_array_equal(b, [1, 1, 1, 0, 0])

    def test_calma_instantanea_de_5_dias(self):
        cat = cl.catalogo(dav_serie(30, [3]))  # un día suelto: no es evento pero quita la calma de los días 3…7
        self.assertEqual(int(cat["bloqueado"].sum()), 0)
        calma = cat["calma"][EA]
        self.assertTrue(calma[8] and not calma[3:8].any())
        self.assertFalse(calma[:4].any())  # sin 5 días de historia no hay calma

    def test_por_tramos_igual_que_de_una_vez(self):
        m = dav_serie(400, list(range(50, 58)) + list(range(180, 200)) + list(range(360, 368)))
        entero = cl.catalogo(m)
        tramos = cl.catalogo(m, tramo=120, solape=30)
        for v in ("bloqueado", "calma"):
            np.testing.assert_array_equal(entero[v], tramos[v], v)


class Probabilidades(unittest.TestCase):
    def test_bloqueo_por_dia_del_calendario_con_ventana(self):
        # 2 años de 365 días; EA bloqueado del 1 al 10 de enero del primer año: la ventana del 5 de enero tiene
        # 30 días por año (del 22 de diciembre al 20 de enero), 60 en total, y 10 bloqueados
        dias = np.arange(np.datetime64("2001-01-01"), np.datetime64("2003-01-01"))
        b = np.zeros((5, len(sectores.SECTORES), len(dias)), dtype=bool)
        b[:, EA, 0:10] = True
        p = cl.prob_bloqueo(b, dias, medio_ancho=15)
        self.assertAlmostEqual(float(p[EA, 0, 4]), 10 / 60)  # paso 0, día del año 5
        self.assertAlmostEqual(float(p[EA, 15, 4]), 10 / 60)  # el paso 15 usa la censura k = 4, aquí igual
        self.assertEqual(p.shape, (len(sectores.SECTORES), 16, 366))

    def test_la_ventana_da_la_vuelta_al_ano(self):
        dias = np.arange(np.datetime64("2001-01-01"), np.datetime64("2002-01-01"))
        b = np.zeros((5, len(sectores.SECTORES), len(dias)), dtype=bool)
        b[:, EA, -3:] = True  # 29–31 de diciembre
        self.assertGreater(float(cl.prob_bloqueo(b, dias)[EA, 0, 0]), 0)

    def test_inicio_condicionado_a_la_calma(self):
        # un solo caso en calma (21 de enero) con inicio en el paso 3: prob. de inicio 1 en días 1–5 y 0 en 6–10
        dias = np.arange(np.datetime64("2001-01-01"), np.datetime64("2001-03-01"))
        b = np.zeros((5, len(sectores.SECTORES), len(dias)), dtype=bool)
        b[:, EA, 23:30] = True
        calma = np.zeros((len(sectores.SECTORES), len(dias)), dtype=bool)
        calma[EA, 20] = True
        p, n = cl.prob_inicio(b, calma, dias)
        np.testing.assert_array_equal(p[EA, :, 19], [1.0, 0.0])  # día del año 20: su ventana incluye el 21
        self.assertEqual(int(n[EA, 19]), 1)


if __name__ == "__main__":
    unittest.main()
