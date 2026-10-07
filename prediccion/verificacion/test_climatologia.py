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
        for v in ("bloqueado", "calma", "bloqueado_v1", "genesis", "calma_v2"):
            np.testing.assert_array_equal(entero[v], tramos[v], v)


class CatalogoV2(unittest.TestCase):
    """Variante V2 (2026-10-07): la calma solo la quitan los objetos instantáneos grandes (≥ 5×10⁵ km² ese día)."""

    def test_un_objeto_pequenio_no_quita_la_calma_v2(self):
        cat = cl.catalogo(dav_serie(30, [3], lat=(60, 62.5), lon=(0, 5)))  # 2 × 3 celdas: ~2,2×10⁵ km²
        self.assertFalse(cat["calma"][EA, 3:8].any())
        self.assertTrue(cat["calma_v2"][EA, 4:9].all())

    def test_un_objeto_grande_quita_la_calma_v2_5_dias(self):
        cat = cl.catalogo(dav_serie(30, [3]))  # 4 × 13 celdas
        calma = cat["calma_v2"][EA]
        self.assertTrue(calma[8] and not calma[3:8].any())
        self.assertFalse(calma[:4].any())  # sin 5 días de historia no hay calma

    def test_frecuencia_por_estacion(self):
        dias = np.arange(np.datetime64("2001-01-01"), np.datetime64("2002-01-01"))
        calma = np.zeros((len(sectores.SECTORES), len(dias)), dtype=bool)
        calma[EA, :59] = True  # enero y febrero: 59 de los 90 días de DEF
        f = cl.frecuencia_por_estacion(calma, dias)
        self.assertAlmostEqual(float(f[EA, 0]), 59 / 90)
        np.testing.assert_array_equal(f[EA, 1:], [0, 0, 0])
        self.assertEqual(list(cl.ESTACIONES), ["DEF", "MAM", "JJA", "SON"])


class CatalogoV1(unittest.TestCase):
    def test_a_45N_ocupa_el_sector_pero_no_en_v1(self):
        cat = cl.catalogo(dav_serie(30, range(10, 21), lat=(42.5, 47.5)))
        self.assertTrue(cat["bloqueado"][0, EA, 12])
        self.assertFalse(cat["bloqueado_v1"][:, EA].any())
        reglas = list(cl.producto.REGLAS)
        np.testing.assert_array_equal(np.nonzero(cat["genesis"][reglas.index("F3-4"), EA])[0], [10])
        self.assertFalse(cat["genesis"][reglas.index("F3-4-V1"), EA].any())


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


class GenesisClimatologica(unittest.TestCase):
    def test_probabilidad_por_ventana_y_fraccion_de_division(self):
        # una génesis en el índice 23: la tienen en los días 1–5 las pasadas 18…22 y en los días 6–10 las 13…17
        dias = np.arange(np.datetime64("2001-01-01"), np.datetime64("2001-03-01"))
        gen = np.zeros((2, len(sectores.SECTORES), len(dias)), dtype=np.uint8)
        gen[0, EA, 23] = 2
        p, division = cl.prob_genesis(gen, dias, medio_ancho=0)
        np.testing.assert_array_equal(p[0, EA, :, 17:23], [[0, 1, 1, 1, 1, 1], [1, 0, 0, 0, 0, 0]])
        self.assertEqual(float(division[0, EA]), 1.0)
        self.assertTrue(np.isnan(division[1, EA]))


if __name__ == "__main__":
    unittest.main()
