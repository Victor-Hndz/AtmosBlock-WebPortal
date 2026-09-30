"""PRD-501: verdad ERA5 de una pasada con la misma función que el producto (preregistro F3, F5), sin red.

Uso: python prediccion/verificacion/test_verdad.py
"""
import pathlib
import sys
import unittest

import numpy as np
import xarray as xr

AQUI = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(AQUI))
sys.path.insert(0, str(AQUI.parent / "producto"))
import test_producto as tp  # noqa: E402
import producto  # noqa: E402
import verdad  # noqa: E402

G = 9.80665


def era5(alta_en_dias, inicio="2010-07-01", geopotencial=True):
    """ERA5 diario a 00 UTC con el formato de los ficheros locales (time, lat 90→0, lon −180→179,75 a 0,25°)."""
    lat = np.arange(90, -0.01, -0.25)
    lon = np.arange(-180, 180, 0.25)
    base = 5500 - 10 * lat[:, None] + 0 * lon[None, :]
    alta = 300 * np.exp(-((lat[:, None] - 60) / 10) ** 2 - ((lon[None, :] - 10) / 20) ** 2)
    dias = 26
    z = np.stack([base + (alta if d in alta_en_dias else 0) for d in range(dias)]).astype("float32")
    return xr.DataArray(z * (G if geopotencial else 1), dims=("time", "latitude", "longitude"),
                        coords={"time": np.datetime64(inicio) + np.arange(dias) * np.timedelta64(1, "D"),
                                "latitude": lat, "longitude": lon})


class Verdad(unittest.TestCase):
    def test_es_el_producto_con_era5_como_unico_miembro(self):
        # días del fichero: 0…25; la pasada del día 5 usa la ventana 1…20 (d−4…d+15); bloqueo del día 8 al 15
        z = era5(set(range(8, 16)))
        v = verdad.verdad(z, np.datetime64("2010-07-06"))
        m = tp.miembros([set(range(3, 11))])
        esperado = producto.calcular(m, tp.historia([False] * 4), tp.analisis_d())
        np.testing.assert_array_equal(v["bloqueado"].values, esperado["bloqueado"].values[:, 0])
        np.testing.assert_array_equal(v["inicio"].values, esperado["inicio"].values[:, 0])
        np.testing.assert_array_equal(v["calma"].values, esperado["calma"].values)
        self.assertEqual(int(v["inicio"].sel(sector="EA")), 3)

    def test_la_calma_usa_la_dav_instantanea_de_era5(self):
        v = verdad.verdad(era5({3}), np.datetime64("2010-07-06"))  # un día suelto en d−2
        self.assertEqual(int(v["calma"].sel(sector="EA")), 0)
        self.assertEqual(int(v["bloqueado"].sum()), 0)

    def test_acepta_metros(self):
        a = verdad.verdad(era5(set(range(8, 16))), np.datetime64("2010-07-06"))
        b = verdad.verdad(era5(set(range(8, 16)), geopotencial=False), np.datetime64("2010-07-06"))
        np.testing.assert_array_equal(a["bloqueado"].values, b["bloqueado"].values)

    def test_exige_los_20_dias_de_la_ventana(self):
        with self.assertRaises(ValueError):
            verdad.verdad(era5(set()), np.datetime64("2010-07-02"))  # faltaría d−4
        with self.assertRaises(ValueError):
            verdad.verdad(era5(set()), np.datetime64("2010-07-12"))  # faltaría d+15


if __name__ == "__main__":
    unittest.main()
