"""PRD-303: producto probabilístico diario (F3-3, F3-4, F3-5 con su aclaración y F3-6), sin red.

Uso: python prediccion/producto/test_producto.py
"""
import json
import pathlib
import sys
import tempfile
import unittest

import numpy as np
import xarray as xr

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import producto  # noqa: E402

LAT = np.arange(0, 90.01, 2.5)
LON = np.arange(-180, 180, 2.5)
EA = list(producto.sectores.SECTORES).index("EA")


def dia(alta=False):
    """Z500 (lat, lon) a 2,5°: flujo zonal sin bloqueo; con alta, un bloqueo de ~2,5×10⁶ km² en 60°N 10°E (EA)."""
    z = 5500 - 10 * LAT[:, None] + 0 * LON[None, :]
    if alta:
        z = z + 300 * np.exp(-((LAT[:, None] - 60) / 10) ** 2 - ((LON[None, :] - 10) / 20) ** 2)
    return z.astype("float32")


def miembros(pasos_con_alta_por_miembro):
    """(number, step, lat, lon) con 16 pasos; pasos_con_alta_por_miembro: lista de conjuntos de pasos."""
    datos = np.stack([np.stack([dia(s in pasos) for s in range(16)]) for pasos in pasos_con_alta_por_miembro])
    return xr.DataArray(datos, dims=("number", "step", "latitude", "longitude"),
                        coords={"number": np.arange(1, len(datos) + 1), "step": np.arange(16),
                                "latitude": LAT, "longitude": LON})


def historia(con_alta):
    """Pseudoanálisis de los días d−H…d−1 (H = len(con_alta))."""
    datos = np.stack([dia(a) for a in con_alta]) if con_alta else np.zeros((0, LAT.size, LON.size), "float32")
    return xr.DataArray(datos, dims=("dia", "latitude", "longitude"), coords={"latitude": LAT, "longitude": LON})


def analisis_d(alta=False):
    return xr.DataArray(dia(alta), dims=("latitude", "longitude"), coords={"latitude": LAT, "longitude": LON})


class Pasada(unittest.TestCase):
    def test_bloqueo_en_curso_no_es_inicio(self):
        ds = producto.calcular(miembros([set(range(16))] * 2), historia([True] * 4), analisis_d(True))
        np.testing.assert_array_equal(ds["prob_sector"][EA], np.ones(16))
        self.assertEqual(int(ds["calma"][EA]), 0)
        np.testing.assert_array_equal(ds["inicio"][EA], [0, 0])
        self.assertTrue(np.isnan(ds["prob_inicio"][EA]).all())

    def test_inicio_en_el_dia_3(self):
        ds = producto.calcular(miembros([set(range(3, 11))] * 2), historia([False] * 4), analisis_d())
        b = ds["bloqueado"][EA].values
        self.assertTrue(b[:, 3:11].all() and not b[:, :3].any() and not b[:, 11:].any())
        self.assertEqual(int(ds["calma"][EA]), 1)
        np.testing.assert_array_equal(ds["inicio"][EA], [3, 3])
        np.testing.assert_array_equal(ds["prob_inicio"][EA], [1.0, 0.0])  # W1 = días 1–5, W2 = 6–10
        self.assertEqual(int(ds["historia_incompleta"]), 0)

    def test_menos_de_5_dias_no_es_evento(self):
        ds = producto.calcular(miembros([{3, 4, 5}] * 2), historia([False] * 4), analisis_d())
        self.assertEqual(int(ds["bloqueado"].sum()), 0)
        np.testing.assert_array_equal(ds["inicio"][EA], [-1, -1])
        np.testing.assert_array_equal(ds["prob_inicio"][EA], [0.0, 0.0])

    def test_la_historia_completa_la_persistencia(self):
        # 4 días de pseudoanálisis + pasos 0–1: 6 días seguidos, evento aunque en la previsión solo haya 2
        ds = producto.calcular(miembros([{0, 1}]), historia([True] * 4), analisis_d(True))
        np.testing.assert_array_equal(ds["bloqueado"][EA, 0, :3], [1, 1, 0])
        sin = producto.calcular(miembros([{0, 1}]), historia([False] * 4), analisis_d(True))
        self.assertEqual(int(sin["bloqueado"].sum()), 0)

    def test_probabilidad_es_fraccion_de_miembros(self):
        ds = producto.calcular(miembros([set(range(2, 9)), set(), set(range(2, 9)), set()]),
                               historia([False] * 4), analisis_d())
        self.assertEqual(float(ds["prob_sector"][EA, 4]), 0.5)
        np.testing.assert_array_equal(ds["prob_inicio"][EA], [0.5, 0.0])
        self.assertEqual(float(ds["prob_evento"].sel(latitude=60, longitude=10)[4]), 0.5)

    def test_calma_con_la_dav_instantanea_de_la_pseudoanalisis(self):
        # aclaración de F3-5: una señal instantánea de un día en d−2 ya quita la calma, aunque no llegue a evento
        ds = producto.calcular(miembros([set(range(3, 11))]), historia([False, False, True, False]), analisis_d())
        self.assertEqual(int(ds["calma"][EA]), 0)
        self.assertTrue(np.isnan(ds["prob_inicio"][EA]).all())

    def test_historia_incompleta(self):
        ds = producto.calcular(miembros([set()]), historia([False] * 2), analisis_d())
        self.assertEqual(int(ds["historia_incompleta"]), 1)
        self.assertEqual(int(ds["dias_historia"]), 2)

    def test_guarda_la_pseudoanalisis_y_el_preregistro(self):
        ds = producto.calcular(miembros([set()]), historia([False] * 4), analisis_d())
        self.assertEqual(ds["pseudoanalisis"].shape, (5, LAT.size, LON.size))
        self.assertIn("2026-09-29", ds.attrs["preregistro"])


def escribir_archivo(carpeta, modelo, fecha, alta_en_pasos=()):
    """Fichero con el formato de archivar.py: lat 90→0 y lon −180→178,75 a 1,25°, z500 en m, 2 miembros."""
    lat = np.arange(90, -0.01, -1.25)
    lon = np.arange(-180, 180, 1.25)
    base = 5500 - 10 * lat[:, None] + 0 * lon[None, :]
    alta = 300 * np.exp(-((lat[:, None] - 60) / 10) ** 2 - ((lon[None, :] - 10) / 20) ** 2)
    z = np.stack([base + (alta if s in alta_en_pasos else 0) for s in range(16)])
    z = np.stack([z, z]).astype("float32")
    da = xr.DataArray(z, dims=("number", "step", "latitude", "longitude"),
                      coords={"number": [1, 2], "step": np.arange(16) * np.timedelta64(24, "h"),
                              "latitude": lat, "longitude": lon})
    da.to_dataset(name="z500").to_netcdf(pathlib.Path(carpeta) / f"z500_{modelo}_ens_{fecha}_00z_hn_1p25.nc")


class Diario(unittest.TestCase):
    def test_escribe_netcdf_json_y_png(self):
        with tempfile.TemporaryDirectory() as d:
            for f in ("20260926", "20260927", "20260928", "20260929"):
                escribir_archivo(d, "ifs", f)
            escribir_archivo(d, "ifs", "20260930", alta_en_pasos=range(2, 10))
            escribir_archivo(d, "aifs", "20260930", alta_en_pasos=range(2, 10))
            for modelo in ("ifs", "aifs"):
                self.assertEqual(producto.main(["--fecha", "20260930", "--modelo", modelo, "--archivo", d,
                                                "--salida", d]), 0)
                base = pathlib.Path(d) / f"producto_{modelo}_20260930"
                with xr.open_dataset(base.with_suffix(".nc")) as ds:
                    self.assertEqual(int(ds["historia_incompleta"]), 0)
                    self.assertEqual(int(ds["inicio"][EA, 0]), 2)
                j = json.loads(base.with_suffix(".json").read_text(encoding="utf-8"))
                self.assertEqual(j["modelo"], modelo)
                self.assertEqual(j["sectores"]["EA"]["aviso_inicio"], ["dias_1_5"])
                self.assertEqual(len(j["sectores"]["EA"]["probabilidad"]), 16)
                self.assertIn("CC-BY-4.0", j["atribucion"])
                self.assertGreater(base.with_suffix(".png").stat().st_size, 0)

    def test_sin_historia_marca_incompleta(self):
        with tempfile.TemporaryDirectory() as d:
            escribir_archivo(d, "ifs", "20260930")
            self.assertEqual(producto.main(["--fecha", "20260930", "--modelo", "ifs", "--archivo", d,
                                            "--salida", d]), 0)
            with xr.open_dataset(pathlib.Path(d) / "producto_ifs_20260930.nc") as ds:
                self.assertEqual(int(ds["historia_incompleta"]), 1)
                self.assertEqual(int(ds["dias_historia"]), 0)

    def test_crea_la_carpeta_de_salida(self):
        # el workflow llama con --salida producto sin crearla (fallo del 2026-09-30 en Actions)
        with tempfile.TemporaryDirectory() as d:
            escribir_archivo(d, "ifs", "20260930")
            salida = pathlib.Path(d) / "no" / "existe"
            self.assertEqual(producto.main(["--fecha", "20260930", "--modelo", "ifs", "--archivo", d,
                                            "--salida", str(salida)]), 0)
            self.assertTrue((salida / "producto_ifs_20260930.json").exists())


if __name__ == "__main__":
    unittest.main()
