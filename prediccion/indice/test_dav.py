"""PRD-201: índice de Davini et al. (2012) por miembro y paso sobre el archivo diario, sin red.

Uso: python prediccion/indice/test_dav.py
"""
import pathlib
import sys
import tempfile
import unittest

import numpy as np
import xarray as xr

AQUI = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(AQUI))
import dav  # noqa: E402

FIXTURES = AQUI.parents[1] / "backend/FAST-IBAN_Project/execution/code/tests/fixtures"
G = 9.80665


def era5(caso):
    """Caso ERA5 del repo (0,25°) en m, a 2,5° como hace el índice."""
    z = xr.open_dataset(FIXTURES / caso)["z"] / G
    return dav.a_2p5(z)


def campo(z_de_lat, miembros=1, pasos=1):
    """Campo a 2,5° (lat 0→90) sin dependencia de la longitud, con z_de_lat(lat) en m."""
    lat = np.arange(0, 90.01, 2.5)
    lon = np.arange(-180, 180, 2.5)
    datos = np.broadcast_to(z_de_lat(lat)[:, None], (miembros, pasos, lat.size, lon.size)).astype("float32")
    return xr.DataArray(datos, dims=("number", "step", "latitude", "longitude"),
                        coords={"number": np.arange(1, miembros + 1), "step": np.arange(pasos),
                                "latitude": lat, "longitude": lon})


class ReproduceBlocktrack(unittest.TestCase):
    """P2: 0 discrepancias con DAV() de blocktrack v1.1 (6e4dc14) en ERA5 (tests/generar_referencia.py)."""

    ref = np.load(AQUI / "tests/referencia_blocktrack.npz")

    def comprobar(self, caso, clave, ghgs2):
        m = dav.mascara(era5(caso), ghgs2=ghgs2)
        esperada = self.ref[clave]
        self.assertEqual(m.shape, esperada.shape)
        self.assertGreater(esperada.sum(), 0)
        self.assertEqual(int((m.values != esperada).sum()), 0)

    def test_2022_03_14(self):
        self.comprobar("geopot_500hPa_2022-03-14_00-06-12-18UTC.nc", "2022-03-14", ghgs2=False)

    def test_2022_03_14_ghgs2(self):
        self.comprobar("geopot_500hPa_2022-03-14_00-06-12-18UTC.nc", "2022-03-14_ghgs2", ghgs2=True)

    def test_2003_08_14(self):
        self.comprobar("geopot_500hPa_2003-08-14-15_18-00UTC.nc", "2003-08-14", ghgs2=False)

    def test_2003_08_14_ghgs2(self):
        self.comprobar("geopot_500hPa_2003-08-14-15_18-00UTC.nc", "2003-08-14_ghgs2", ghgs2=True)


class Mascara(unittest.TestCase):
    def test_flujo_zonal_no_bloquea(self):
        m = dav.mascara(campo(lambda lat: 5900 - 10 * lat))
        self.assertEqual(int(m.sum()), 0)

    def test_gradiente_invertido_bloquea_solo_en_30_75(self):
        # z sube hasta 60°N y baja después: en 60°N GHGS > 0 y GHGN < −10
        m = dav.mascara(campo(lambda lat: 5500 + 300 * np.exp(-((lat - 60) / 10) ** 2)))
        filas = m.isel(number=0, step=0, longitude=0).to_series()
        self.assertEqual(filas[60.0], 1)
        self.assertEqual(int(filas[filas.index < 30].sum() + filas[filas.index > 75].sum()), 0)

    def test_ghgs2_exige_flujo_del_oeste_al_sur(self):
        # misma dorsal sobre un fondo sin gradiente: GHGS2 = 0, no < −5
        z = campo(lambda lat: 5500 + 300 * np.exp(-((lat - 60) / 10) ** 2))
        self.assertGreater(int(dav.mascara(z, ghgs2=False).sum()), 0)
        self.assertEqual(int(dav.mascara(z, ghgs2=True).sum()), 0)

    def test_acepta_latitudes_descendentes_del_archivo(self):
        z = campo(lambda lat: 5500 + 300 * np.exp(-((lat - 60) / 10) ** 2))
        m = dav.mascara(z.sortby("latitude", ascending=False))
        self.assertEqual(int(m.sel(latitude=60.0).isel(number=0, step=0, longitude=0)), 1)


class A2p5(unittest.TestCase):
    def test_toma_uno_de_cada_dos_nodos_de_1_25(self):
        lat = np.arange(90, -0.01, -1.25)
        lon = np.arange(-180, 180, 1.25)
        z = xr.DataArray(lat[:, None] * 1000 + lon[None, :], dims=("latitude", "longitude"),
                         coords={"latitude": lat, "longitude": lon})
        r = dav.a_2p5(z)
        np.testing.assert_array_equal(r.latitude, np.arange(0, 90.01, 2.5))
        np.testing.assert_array_equal(r.longitude, np.arange(-180, 180, 2.5))
        self.assertEqual(float(r.sel(latitude=62.5, longitude=-17.5)), 62.5 * 1000 - 17.5)


class Probabilidad(unittest.TestCase):
    def test_fraccion_de_miembros(self):
        m = xr.DataArray(np.array([[1, 0], [1, 1], [0, 0], [1, 0]], dtype="uint8"), dims=("number", "latitude"))
        np.testing.assert_allclose(dav.probabilidad(m), [0.75, 0.25])


class Diario(unittest.TestCase):
    def escribir(self, z):
        d = tempfile.TemporaryDirectory()
        self.addCleanup(d.cleanup)
        entrada = pathlib.Path(d.name) / "z500_ifs_ens_20260929_00z_hn_1p25.nc"
        z.to_dataset(name="z500").to_netcdf(entrada)
        salida = pathlib.Path(d.name) / "dav.nc"
        self.assertEqual(dav.main([str(entrada), str(salida)]), 0)
        ds = xr.open_dataset(salida)
        self.addCleanup(ds.close)
        return ds

    def test_escribe_principal_y_variante_ghgs2(self):
        z = campo(lambda lat: 5500 + 300 * np.exp(-((lat - 60) / 10) ** 2) - 10 * lat, miembros=3, pasos=2)
        ds = self.escribir(z)
        for v in ("dav", "dav_ghgs2"):
            self.assertEqual(ds[v].dtype, np.uint8)
            self.assertEqual(ds[v].dims, ("number", "step", "latitude", "longitude"))
        for v in ("probabilidad", "probabilidad_ghgs2"):
            self.assertEqual(ds[v].dims, ("step", "latitude", "longitude"))
            self.assertEqual(float(ds[v].sel(latitude=60.0).isel(step=0, longitude=0)), 1.0)
        self.assertIn("Davini", ds.attrs["indice"])
        self.assertIn("00 UTC", ds.attrs["tiempo"])

    def test_la_principal_no_aplica_ghgs2(self):
        # dorsal sin flujo del oeste al sur: bloquea en la principal, no en la variante
        ds = self.escribir(campo(lambda lat: 5500 + 300 * np.exp(-((lat - 60) / 10) ** 2)))
        self.assertGreater(int(ds["dav"].sum()), 0)
        self.assertEqual(int(ds["dav_ghgs2"].sum()), 0)


if __name__ == "__main__":
    unittest.main()
