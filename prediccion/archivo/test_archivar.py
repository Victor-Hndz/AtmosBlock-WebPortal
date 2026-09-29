"""PRD-101: reducción y escritura del archivo diario de Z500 de las ENS de ECMWF, sin red.

Uso: python prediccion/archivo/test_archivar.py
"""
import pathlib
import sys
import tempfile
import unittest

import numpy as np
import xarray as xr

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import archivar  # noqa: E402


def campo_025(miembros=2, pasos=3, factor=1.0):
    """Rejilla de ECMWF open data (0,25°, lat 90→−90, lon 0→359,75) con un valor conocido por nodo, en m / factor."""
    lat = np.arange(90, -90.01, -0.25)
    lon = np.arange(0, 360, 0.25)
    z = 5500 + 10 * np.cos(np.deg2rad(lat))[:, None] + 0.01 * lon[None, :]
    datos = np.broadcast_to(z, (miembros, pasos, lat.size, lon.size)).copy()
    datos += np.arange(miembros)[:, None, None, None] + 100 * np.arange(pasos)[None, :, None, None]
    return xr.DataArray(datos / factor, dims=("number", "step", "latitude", "longitude"),
                        coords={"number": np.arange(1, miembros + 1),
                                "step": np.arange(pasos) * np.timedelta64(24, "h"),
                                "latitude": lat, "longitude": lon})


class Reducir(unittest.TestCase):
    def test_rejilla_hemisferio_norte_a_1_25(self):
        z = archivar.reducir(campo_025(), factor=1.0)
        self.assertEqual(z.latitude.values[0], 90.0)
        self.assertEqual(z.latitude.values[-1], 0.0)
        np.testing.assert_allclose(np.diff(z.latitude.values), -1.25)
        self.assertEqual(z.longitude.values[0], -180.0)
        self.assertEqual(z.longitude.values[-1], 178.75)
        np.testing.assert_allclose(np.diff(z.longitude.values), 1.25)

    def test_toma_los_nodos_sin_interpolar(self):
        original = campo_025()
        z = archivar.reducir(original, factor=1.0)
        esperado = original.sel(latitude=45.0, longitude=190.0)  # 190° = −170°
        np.testing.assert_allclose(z.sel(latitude=45.0, longitude=-170.0), esperado)

    def test_factor_de_geopotencial_a_metros(self):
        z = archivar.reducir(campo_025(factor=1 / archivar.G), factor=1 / archivar.G)
        self.assertAlmostEqual(float(z.max()), float(archivar.reducir(campo_025(), 1.0).max()), places=6)

    def test_rechaza_rejilla_que_no_es_0_25(self):
        with self.assertRaises(ValueError):
            archivar.reducir(campo_025().isel(latitude=slice(None, None, 2)), factor=1.0)


class Validar(unittest.TestCase):
    def test_exige_50_miembros_y_16_pasos(self):
        with self.assertRaises(ValueError):
            archivar.validar(archivar.reducir(campo_025(miembros=2, pasos=3), 1.0))

    def test_rechaza_valores_fuera_de_rango_fisico(self):
        z = archivar.reducir(campo_025(), 1.0) * 0 + 100.0  # 100 m: unidades equivocadas
        with self.assertRaises(ValueError):
            archivar.comprobar_rango(z)


class Escribir(unittest.TestCase):
    def test_ida_y_vuelta_en_int16_con_error_de_medio_paso(self):
        z = archivar.reducir(campo_025(), 1.0)
        with tempfile.TemporaryDirectory() as d:
            ruta = pathlib.Path(d) / "x.nc"
            archivar.escribir(z, ruta, modelo="ifs", fecha="20260929")
            with xr.open_dataset(ruta) as ds:
                self.assertEqual(ds["z500"].encoding["dtype"], np.dtype("int16"))
                self.assertLessEqual(float(abs(ds["z500"] - z).max()), 0.05 + 1e-6)  # medio paso de 0,1 m
                self.assertIn("CC-BY-4.0", ds.attrs["license"])
                self.assertIn("ECMWF", ds.attrs["source"])
                self.assertEqual(ds.attrs["forecast_date"], "20260929")
                self.assertEqual(ds["z500"].attrs["units"], "m")

    def test_nombre_del_fichero(self):
        self.assertEqual(archivar.nombre("aifs", "20260929"), "z500_aifs_ens_20260929_00z_hn_1p25.nc")


if __name__ == "__main__":
    unittest.main()
