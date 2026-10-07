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
SECT = list(producto.sectores.SECTORES)
EA = SECT.index("EA")


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

    def test_censura_solo_excluye_los_que_empiezan_despues_del_paso_11(self):
        # la ventana acaba en el paso 15: un bloqueo que empieza en el 12 no llega a 5 días; uno del 10 sí se ve en el 12
        for inicio, visibles in ((10, list(range(10, 16))), (11, list(range(11, 16))), (12, [])):
            ds = producto.calcular(miembros([set(range(inicio, 16))]), historia([False] * 4), analisis_d())
            self.assertEqual([s for s in range(16) if ds["bloqueado"][EA, 0, s]], visibles, inicio)
        self.assertIn("después del paso 11", ds.attrs["censura"])

    def test_guarda_la_pseudoanalisis_y_el_preregistro(self):
        ds = producto.calcular(miembros([set()]), historia([False] * 4), analisis_d())
        self.assertEqual(ds["pseudoanalisis"].shape, (5, LAT.size, LON.size))
        self.assertIn("2026-09-29", ds.attrs["preregistro"])


def mascara_dia(*bloques):
    """DAV de un día (lat, lon) a 2,5° con rectángulos (lat0, lat1, lon0, lon1), extremos incluidos, en grados."""
    m = np.zeros((LAT.size, LON.size), bool)
    for a, b, c, e in bloques:
        m[np.ix_((LAT >= a) & (LAT <= b), (LON >= c) & (LON <= e))] = True
    return m


class CalmaV2(unittest.TestCase):
    """F3-5-V2 (firmada el 2026-10-07): solo quitan la calma los objetos instantáneos de ≥ 5×10⁵ km² ese día."""

    def grandes(self, m, sector):
        return bool(producto.grandes_por_sector(m)[SECT.index(sector)])

    def test_objeto_pequenio_no_quita_la_calma_v2(self):
        m = mascara_dia((60, 62.5, 0, 5))  # 2 filas × 3 longitudes en EA: ~2,2×10⁵ km²
        self.assertTrue(producto.sectores.sector_bloqueado(m, "EA"))  # sí quita la calma de la aclaración (A)
        self.assertFalse(self.grandes(m, "EA"))

    def test_objeto_grande_en_el_sector_quita_la_calma_v2(self):
        self.assertTrue(self.grandes(mascara_dia((55, 65, 0, 10)), "EA"))  # 5 × 5 celdas: ~9,7×10⁵ km²

    def test_la_regla_se_aplica_a_la_huella_de_cada_objeto(self):
        # A: grande, con solo 2 longitudes en EA (37,5 y 40); B: grande, con solo la de 35 en las filas de EA.
        # La unión colapsada tendría 3 longitudes seguidas, pero ninguna huella por separado.
        a = (55, 65, 37.5, 60)
        b = [(40, 45, 35, 35), (20, 37.5, 0, 35)]
        m = mascara_dia(a, *b)
        self.assertTrue(producto.sectores.sector_bloqueado(m, "EA"))
        self.assertFalse(self.grandes(m, "EA"))

    def test_un_objeto_que_cruza_180_cuenta_entero(self):
        # 3 filas en 57,5–62,5°N: 2 longitudes al oeste de 180° y 3 al este (~2,3 y 3,5×10⁵ km²; juntas, 5,8×10⁵)
        m = mascara_dia((57.5, 62.5, 175, 177.5), (57.5, 62.5, -180, -175))
        self.assertTrue(self.grandes(m, "PA"))

    def test_en_el_producto(self):
        # el bloqueo grande de dia(True) en d−2 quita las dos calmas
        ds = producto.calcular(miembros([set(range(3, 11))]), historia([False, False, True, False]), analisis_d())
        self.assertEqual((int(ds["calma"][EA]), int(ds["calma_v2"][EA])), (0, 0))
        self.assertTrue(np.isnan(ds["prob_inicio_v2"][EA]).all())
        # en calma (A) también hay calma-V2, con el mismo inicio
        ds = producto.calcular(miembros([set(range(3, 11)), set()]), historia([False] * 4), analisis_d())
        self.assertEqual((int(ds["calma"][EA]), int(ds["calma_v2"][EA])), (1, 1))
        np.testing.assert_array_equal(ds["prob_inicio_v2"][EA], ds["prob_inicio"][EA])
        self.assertIn("V2 el 2026-10-07", ds.attrs["preregistro"])


def etiquetas(h, bloques):
    """Etiquetas (h+16, 37, 144) con [(etiqueta, días, lat0, lat1, lon0, lon1)] en índices de la serie."""
    et = np.zeros((h + 16, 37, 144), dtype=np.int64)
    for e, dias, la0, la1, lo0, lo1 in bloques:
        for d in dias:
            et[d, int(la0 / 2.5):int(la1 / 2.5) + 1, int((lo0 + 180) / 2.5):int((lo1 + 180) / 2.5) + 1] = e
    return et


class GenesisV1(unittest.TestCase):
    """F3-5-V1 (firmada el 2026-09-30): génesis = primer día de una etiqueta nueva en la ventana, en los pasos 1…15,
    si su huella cumple la regla de sector (F3-4 o F3-4-V1); 2 si solapa la DAV del día anterior (división)."""

    H = 4
    REGLAS = list(producto.REGLAS)

    def g(self, et, dav=None):
        dav = np.zeros(et.shape, dtype=bool) if dav is None else dav
        return producto.genesis(et, dav, self.H)

    def test_evento_nuevo_en_el_paso_3(self):
        g = self.g(etiquetas(self.H, [(5, range(self.H + 3, self.H + 10), 55, 62.5, 0, 30)]))
        np.testing.assert_array_equal(np.nonzero(g[:, EA])[1], [3, 3])  # las dos reglas, solo en el paso 3
        self.assertEqual(int(g.sum()), 2)

    def test_evento_que_viene_de_la_historia_no_es_genesis(self):
        self.assertEqual(int(self.g(etiquetas(self.H, [(5, range(0, 12), 55, 62.5, 0, 30)])).sum()), 0)

    def test_paso_0_no_cuenta(self):
        self.assertEqual(int(self.g(etiquetas(self.H, [(5, range(self.H, 12), 55, 62.5, 0, 30)])).sum()), 0)

    def test_a_45N_solo_la_regla_firmada(self):
        g = self.g(etiquetas(self.H, [(5, range(self.H + 2, self.H + 9), 42.5, 47.5, 0, 30)]))
        self.assertEqual(int(g[self.REGLAS.index("F3-4"), EA, 2]), 1)
        self.assertEqual(int(g[self.REGLAS.index("F3-4-V1"), EA].sum()), 0)

    def test_nacida_de_una_division(self):
        et = etiquetas(self.H, [(5, range(self.H + 3, self.H + 10), 55, 62.5, 0, 30)])
        dav = np.zeros(et.shape, dtype=bool)
        dav[self.H + 2, 22, 72] = True  # 55°N, 0°: una celda con DAV el día anterior dentro de la huella
        np.testing.assert_array_equal(self.g(et, dav)[:, EA, 3], [2, 2])

    def test_en_el_producto(self):
        ds = producto.calcular(miembros([set(range(3, 11)), set()]), historia([False] * 4), analisis_d())
        np.testing.assert_array_equal(ds["prob_genesis"].sel(regla="F3-4", sector="EA"), [0.5, 0.0])
        np.testing.assert_array_equal(ds["prob_sector_v1"].sel(sector="EA")[3:11], np.full(8, 0.5))
        self.assertEqual(int(ds["genesis"].sel(regla="F3-4-V1", sector="EA", number=1, paso=3)), 1)


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
                ea = j["sectores"]["EA"]
                self.assertEqual((ea["calma_v2"], ea["prob_inicio_v2"], ea["aviso_inicio_v2"]),
                                 (True, {"dias_1_5": 1.0, "dias_6_10": 0.0}, ["dias_1_5"]))
                self.assertEqual(ea["prob_genesis"], {"dias_1_5": 1.0, "dias_6_10": 0.0})  # regla F3-4
                self.assertEqual(len(j["sectores"]["EA"]["probabilidad"]), 16)
                self.assertIn("CC-BY-4.0", j["atribucion"])
                self.assertGreater(base.with_suffix(".png").stat().st_size, 0)

    def test_json_con_mapa_y_normal_para_la_epoca(self):
        with tempfile.TemporaryDirectory() as d:
            for f in ("20260926", "20260927", "20260928", "20260929"):
                escribir_archivo(d, "ifs", f)
            escribir_archivo(d, "ifs", "20260930", alta_en_pasos=range(2, 10))
            clima = pathlib.Path(d) / "clima.nc"
            doy = np.arange(1, 367)
            xr.Dataset({"prob_bloqueo": (("sector", "paso", "dia_del_anio"),
                                         np.broadcast_to(doy / 1000, (len(SECT), 16, 366)))},
                       coords={"sector": SECT, "paso": np.arange(16), "dia_del_anio": doy}).to_netcdf(clima)
            self.assertEqual(producto.main(["--fecha", "20260930", "--modelo", "ifs", "--archivo", d, "--salida", d,
                                            "--climatologia", str(clima)]), 0)
            j = json.loads((pathlib.Path(d) / "producto_ifs_20260930.json").read_text(encoding="utf-8"))
            m = j["mapa"]
            self.assertEqual(m["lat"], list(np.arange(30, 75.01, 2.5)))
            self.assertEqual((m["lon0"], m["dlon"], len(m["prob"]), len(m["prob"][0]), len(m["prob"][0][0])),
                             (-180, 2.5, 16, 19, 144))
            self.assertEqual(m["prob"][3][m["lat"].index(60)][int((10 + 180) / 2.5)], 100)  # 2 miembros, los 2
            self.assertEqual(m["prob"][0][0][0], 0)
            self.assertEqual(j["sectores_geo"]["PA"], {"lat": [40, 75], "lon": [120, -140]})
            # 30-09 es el día 273 del año: normal del paso s = (273 + s) / 1000
            self.assertEqual(j["sectores"]["EA"]["normal"][:2], [0.273, 0.274])

    def test_sin_climatologia_no_hay_normal(self):
        with tempfile.TemporaryDirectory() as d:
            escribir_archivo(d, "ifs", "20260930")
            self.assertEqual(producto.main(["--fecha", "20260930", "--modelo", "ifs", "--archivo", d, "--salida", d,
                                            "--climatologia", str(pathlib.Path(d) / "no_existe.nc")]), 0)
            j = json.loads((pathlib.Path(d) / "producto_ifs_20260930.json").read_text(encoding="utf-8"))
            self.assertIsNone(j["sectores"]["EA"]["normal"])

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
