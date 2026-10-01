"""PRD-504: archivo diario de ERA5 Z500 para la verdad de la verificación (D12), sin red ni CDS.

Uso: python prediccion/verificacion/test_era5.py
"""
import pathlib
import sys
import tempfile
import unittest
from unittest import mock

import numpy as np
import xarray as xr

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import era5  # noqa: E402

G = 9.80665


def respuesta_cds(factor=G):
    """Lo que devuelve el CDS con area [90, -180, 0, 180]: valid_time y pressure_level de tamaño 1, lat 90→0 y
    lon −180…180 (los dos extremos) a 0,25°, z en m² s⁻²."""
    lat = np.arange(90, -0.01, -0.25)
    lon = np.arange(-180, 180.01, 0.25)
    z = (5500 - 10 * lat[:, None] + 0.01 * lon[None, :]) * factor
    return xr.Dataset({"z": (("valid_time", "pressure_level", "latitude", "longitude"), z[None, None].astype("f4"))},
                      coords={"valid_time": [np.datetime64("2026-09-24T00")], "pressure_level": [500.0],
                              "latitude": lat, "longitude": lon})


class Peticion(unittest.TestCase):
    def test_un_dia_a_00_utc_en_el_hemisferio_norte(self):
        p = era5.peticion("20260924")
        self.assertEqual((p["year"], p["month"], p["day"], p["time"]), (["2026"], ["09"], ["24"], ["00:00"]))
        self.assertEqual((p["variable"], p["pressure_level"], p["area"]), (["geopotential"], ["500"], [90, -180, 0, 180]))


class Reducir(unittest.TestCase):
    def test_nodos_de_1_25_en_metros(self):
        z = era5.reducir(respuesta_cds(), "20260924")
        self.assertEqual(z.dims, ("time", "latitude", "longitude"))
        self.assertEqual(z.shape, (1, 73, 288))
        np.testing.assert_allclose(z.longitude[[0, -1]], [-180, 178.75])
        np.testing.assert_allclose(z.latitude[[0, -1]], [90, 0])
        self.assertAlmostEqual(float(z.isel(time=0).sel(latitude=60, longitude=-17.5)), 5500 - 600 - 0.175, places=2)
        self.assertEqual(z.time.values[0], np.datetime64("2026-09-24"))

    def test_unidades_equivocadas(self):
        with self.assertRaises(ValueError):
            era5.comprobar_rango(era5.reducir(respuesta_cds(factor=G * G), "20260924"))


class Archivar(unittest.TestCase):
    def test_escribe_el_dia_en_int16(self):
        with tempfile.TemporaryDirectory() as d:
            def descargar(fecha, destino):
                respuesta_cds().to_netcdf(destino)
            with mock.patch.object(era5, "descargar", descargar):
                ruta = era5.archivar("20260924", pathlib.Path(d) / "sub")
            self.assertEqual(ruta.name, "z500_era5_20260924_00z_hn_1p25.nc")
            with xr.open_dataset(ruta, mask_and_scale=False) as crudo:
                self.assertEqual(crudo["z500"].dtype, np.int16)
            with xr.open_dataset(ruta) as ds:
                esperado = era5.reducir(respuesta_cds(), "20260924")
                self.assertLess(float(abs(ds["z500"] - esperado).max()), 0.051)
                self.assertIn("Copernicus", ds.attrs["attribution"])

    def test_main_falla_si_no_puede_descargar(self):
        with tempfile.TemporaryDirectory() as d, mock.patch.object(era5, "descargar", side_effect=RuntimeError("403")):
            self.assertEqual(era5.main(["--fecha", "20260924", "--salida", d]), 1)


if __name__ == "__main__":
    unittest.main()
