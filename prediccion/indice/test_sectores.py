"""PRD-302: sectores (F3-1) y regla de sector bloqueado (F3-4) del preregistro de F3, sin red.

Uso: python prediccion/indice/test_sectores.py
"""
import pathlib
import sys
import unittest

import numpy as np

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import sectores  # noqa: E402


def fila(lat):
    return int(lat / 2.5)


def col(lon):
    return int((lon + 180) / 2.5)


def mascara(*celdas):
    """Máscara (37, 144) con las celdas (lat, lon) a 1."""
    m = np.zeros((37, 144), dtype=bool)
    for lat, lon in celdas:
        m[fila(lat), col(lon)] = True
    return m


class Definicion(unittest.TestCase):
    def test_nodos_de_longitud(self):
        esperados = {"GRL": (26, -90, -27.5), "EA": (27, -25, 40), "URA": (11, 42.5, 67.5), "PA": (40, 120, -142.5),
                     "NAM": (20, -140, -92.5), "LLB-Atl": (53, -90, 40), "LLB-Pac": (60, 120, -92.5)}
        for nombre, (n, primero, ultimo) in esperados.items():
            lons = sectores.LON[sectores.columnas(nombre)]
            self.assertEqual((len(lons), lons[0], lons[-1]), (n, primero, ultimo), nombre)

    def test_filas_de_latitud(self):
        np.testing.assert_array_equal(sectores.LAT[sectores.filas("EA")], np.arange(40, 75.01, 2.5))
        np.testing.assert_array_equal(sectores.LAT[sectores.filas("LLB-Pac")], [30, 32.5, 35, 37.5])

    def test_70E_120E_sin_sector(self):
        cubiertas = set()
        for nombre in sectores.PRINCIPALES:
            cubiertas.update(sectores.columnas(nombre))
        self.assertFalse({col(lon) for lon in np.arange(70, 120, 2.5)} & cubiertas)


class SectorBloqueado(unittest.TestCase):
    def bloqueado(self, m, nombre):
        return bool(sectores.sector_bloqueado(m[None], nombre)[0])

    def test_tres_longitudes_adyacentes(self):
        self.assertTrue(self.bloqueado(mascara((60, 0), (60, 2.5), (60, 5)), "EA"))

    def test_dos_no_bastan(self):
        self.assertFalse(self.bloqueado(mascara((60, 0), (60, 2.5), (60, 7.5)), "EA"))

    def test_colapsa_en_latitud(self):
        self.assertTrue(self.bloqueado(mascara((45, 0), (60, 2.5), (70, 5)), "EA"))

    def test_cruza_180_en_el_pacifico(self):
        self.assertTrue(self.bloqueado(mascara((50, 175), (50, 177.5), (50, -180)), "PA"))

    def test_racha_partida_por_el_limite_no_cuenta(self):
        m = mascara((60, -30), (60, -27.5), (60, -25))  # 2 en GRL + 1 en EA
        self.assertFalse(self.bloqueado(m, "GRL"))
        self.assertFalse(self.bloqueado(m, "EA"))

    def test_banda_llb_separada(self):
        m = mascara((37.5, 0), (37.5, 2.5), (37.5, 5))
        self.assertTrue(self.bloqueado(m, "LLB-Atl"))
        self.assertFalse(self.bloqueado(m, "EA"))
        self.assertTrue(self.bloqueado(mascara((40, 0), (40, 2.5), (40, 5)), "EA"))

    def test_dimensiones_previas(self):
        m = np.zeros((3, 4, 37, 144), dtype=bool)
        m[1, 2] = mascara((60, 0), (60, 2.5), (60, 5))
        b = sectores.sector_bloqueado(m, "EA")
        self.assertEqual(b.shape, (3, 4))
        self.assertEqual(int(b.sum()), 1)
        self.assertTrue(b[1, 2])


class FraccionArea(unittest.TestCase):
    def test_sector_entero_y_vacio(self):
        m = np.zeros((2, 37, 144), dtype=bool)
        m[1][np.ix_(sectores.filas("URA"), sectores.columnas("URA"))] = True
        np.testing.assert_allclose(sectores.fraccion_area(m, "URA"), [0.0, 1.0])

    def test_pondera_por_coseno(self):
        # una celda a 40°N pesa más que una a 75°N
        f40 = sectores.fraccion_area(mascara((40, 50))[None], "URA")[0]
        f75 = sectores.fraccion_area(mascara((75, 50))[None], "URA")[0]
        self.assertAlmostEqual(f40 / f75, np.cos(np.deg2rad(40)) / np.cos(np.deg2rad(75)))


if __name__ == "__main__":
    unittest.main()
