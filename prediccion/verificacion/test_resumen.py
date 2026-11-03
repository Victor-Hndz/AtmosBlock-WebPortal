"""PRD-506: resumen de puntuaciones sobre los registros de verificación (F5 preregistrado, V1 y V2), sin red.

Uso: python prediccion/verificacion/test_resumen.py
"""
import pathlib
import sys
import tempfile
import unittest

import numpy as np
import xarray as xr

AQUI = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(AQUI))
sys.path.insert(0, str(AQUI.parent / "producto"))
import producto  # noqa: E402
import resumen  # noqa: E402

SECT = list(producto.sectores.SECTORES)
M = 50


def registro(fecha, modelo, k, obs, clim, calma=1, k_inicio=0, obs_inicio=0, historia_incompleta=0, calma_v2=1,
             calma_v2_era5=None):
    """Registro con el mismo valor en todos los sectores y pasos (k miembros, verdad obs, climatología clim)."""
    s, p, v, r = len(SECT), 16, 2, 2
    lleno = lambda forma, x: np.full(forma, x)  # noqa: E731
    return xr.Dataset(
        {"miembros": M, "k": (("sector", "paso"), lleno((s, p), k)), "obs": (("sector", "paso"), lleno((s, p), obs)),
         "k_v1": (("sector", "paso"), lleno((s, p), k)), "obs_v1": (("sector", "paso"), lleno((s, p), obs)),
         "clim": (("sector", "paso"), lleno((s, p), clim)), "clim_v1": (("sector", "paso"), lleno((s, p), clim)),
         "calma": (("sector",), lleno(s, calma)), "calma_era5": (("sector",), lleno(s, calma)),
         "calma_v2": (("sector",), lleno(s, calma_v2)),
         "calma_v2_era5": (("sector",), lleno(s, calma_v2 if calma_v2_era5 is None else calma_v2_era5)),
         "k_inicio": (("sector", "ventana"), lleno((s, v), k_inicio)),
         "obs_inicio": (("sector", "ventana"), lleno((s, v), obs_inicio)),
         "clim_inicio": (("sector", "ventana"), lleno((s, v), clim)),
         "clim_inicio_v2": (("sector", "ventana"), lleno((s, v), clim)),
         "k_genesis": (("regla", "sector", "ventana"), lleno((r, s, v), k_inicio)),
         "obs_genesis": (("regla", "sector", "ventana"), lleno((r, s, v), obs_inicio)),
         "clim_genesis": (("regla", "sector", "ventana"), lleno((r, s, v), clim)),
         "historia_incompleta": historia_incompleta},
        coords={"sector": SECT, "paso": np.arange(16), "ventana": list(producto.VENTANAS),
                "regla": list(producto.REGLAS)},
        attrs={"fecha": str(np.datetime64(fecha)), "modelo": modelo})


def serie(n, modelo, prevision, inicio="2026-10-01", **kw):
    """n pasadas diarias; prevision(i, obs) da los k miembros; la verdad alterna 1, 0."""
    fechas = np.datetime64(inicio) + np.arange(n)
    return [registro(f, modelo, prevision(i, i % 2), i % 2, 0.5, **kw) for i, f in enumerate(fechas)]


def resumir(regs):
    return resumen.resumir(regs, n_rep=100)  # 1000 en producción; aquí basta para las propiedades


def fila(tabla, **campos):
    return next(x for x in tabla if all(x[c] == v for c, v in campos.items()))


class Primario(unittest.TestCase):
    def test_perfecta_bss_1_y_climatologica_bss_0(self):
        r = resumir(serie(40, "ifs", lambda i, o: o * M) + serie(40, "aifs", lambda i, o: M // 2))
        perfecta = fila(r["primario"], modelo="ifs", sector="EA", paso=1)
        self.assertEqual((perfecta["n"], perfecta["bs"], perfecta["bss"]), (40, 0.0, 1.0))
        self.assertTrue(perfecta["habilidad"])
        clima = fila(r["primario"], modelo="aifs", sector="PA", paso=15)
        self.assertEqual(clima["bss"], 0.0)
        self.assertFalse(clima["habilidad"])
        self.assertEqual(len(r["primario"]), 2 * 2 * 15)  # modelos × {EA, PA} × pasos 1–15

    def test_excluye_la_historia_incompleta(self):
        regs = serie(30, "ifs", lambda i, o: o * M) + serie(5, "ifs", lambda i, o: (1 - o) * M,
                                                           inicio="2026-11-01", historia_incompleta=1)
        self.assertEqual(fila(resumir(regs)["primario"], modelo="ifs", sector="EA", paso=1)["bss"], 1.0)

    def test_sin_pasadas_completas_no_falla(self):
        # Caso real del 18-10: el primer registro (28-09) es de las 4 pasadas con historia incompleta y el resumen
        # moría con IndexError al leer los miembros de una selección vacía.
        regs = [registro("2026-09-28", m, 25, 1, 0.5, historia_incompleta=1) for m in ("ifs", "aifs")]
        r = resumir(regs)
        self.assertEqual(r["pasadas"], {"aifs": 1, "ifs": 1})
        self.assertEqual(r["pasadas_completas"], {"aifs": 0, "ifs": 0})
        self.assertEqual((r["primario"], r["por_estacion"], r["ifs_menos_aifs"]), ([], [], []))
        self.assertTrue(r["secundario"])  # el secundario usa todas las pasadas


class Computabilidad(unittest.TestCase):
    """ADENDA A-1.1: sin n ≥ 2 × bloque el remuestreo no tiene variabilidad y no hay IC ni p que publicar."""

    def test_pocas_pasadas_no_dan_ic_ni_p_ni_habilidad(self):
        r = resumir(serie(8, "ifs", lambda i, o: o * M) + serie(8, "aifs", lambda i, o: o * M))
        f = fila(r["primario"], modelo="ifs", sector="EA", paso=1)
        self.assertEqual((f["n"], f["solo_recuentos"]), (8, True))
        self.assertEqual((f["ic90"], f["p"], f["habilidad"]), ([None, None], None, None))
        self.assertEqual(f["bss"], 1.0)  # el descriptivo se sigue publicando
        d = fila(r["ifs_menos_aifs"], sector="EA", paso=1)
        self.assertEqual((d["solo_recuentos"], d["ic90"], d["p"]), (True, [None, None], None))
        self.assertIsNotNone(d["dbs"])
        self.assertEqual(r["inferencia"]["minimo_pasadas"], 2 * resumen.pu.BLOQUE)

    def test_secundario_con_sucesos_pero_pocas_pasadas_no_entra_en_el_fdr(self):
        r = resumir(serie(20, "ifs", lambda i, o: o * M))  # 20 pasadas, 10 sucesos: pasa MIN_SUCESOS, no el suelo
        f = fila(r["secundario"], familia="ocupacion", modelo="ifs", sector="GRL", paso=1)
        self.assertEqual((f["n"], f["sucesos"], f["solo_recuentos"]), (20, 10, True))
        self.assertNotIn("fdr", f)

    def test_con_muestra_suficiente_si_hay_ic_y_p(self):
        r = resumir(serie(32, "ifs", lambda i, o: o * M) + serie(32, "aifs", lambda i, o: M // 2))
        f = fila(r["primario"], modelo="ifs", sector="EA", paso=1)
        self.assertFalse(f["solo_recuentos"])
        self.assertIsNotNone(f["ic90"][0])
        self.assertTrue(f["habilidad"])
        self.assertEqual(fila(r["ifs_menos_aifs"], sector="EA", paso=1)["solo_recuentos"], False)


class Secundario(unittest.TestCase):
    def test_inicios_solo_con_calma_y_con_10_observados(self):
        pocos = serie(30, "ifs", lambda i, o: 0, k_inicio=M, obs_inicio=1)[:9] + \
            serie(30, "ifs", lambda i, o: 0, inicio="2026-11-01", calma=0, k_inicio=M, obs_inicio=1)
        f = fila(resumir(pocos)["secundario"], familia="inicio", modelo="ifs", sector="EA", ventana="dias_1_5")
        self.assertEqual((f["n"], f["sucesos"], f["solo_recuentos"]), (9, 9, True))
        self.assertIsNone(f["bss"])

    def test_inicios_v2_con_la_calma_v2(self):
        # 32 pasadas fuera de la calma de (A) pero en calma-V2, todas con inicio observado (32 = suelo de A-1.1,
        # antes bastaban 12: con menos, la fila sale de solo recuentos aunque la muestre la calma-V2)
        regs = serie(32, "ifs", lambda i, o: 0, calma=0, k_inicio=M, obs_inicio=1)
        r = resumir(regs)["secundario"]
        a = fila(r, familia="inicio", modelo="ifs", sector="EA", ventana="dias_1_5")
        v2 = fila(r, familia="inicio_v2", modelo="ifs", sector="EA", ventana="dias_1_5")
        self.assertEqual((a["n"], a["solo_recuentos"]), (0, True))
        self.assertEqual((v2["n"], v2["sucesos"], v2["solo_recuentos"], v2["bss"]), (32, 32, False, 1.0))

    def test_familias_y_fdr(self):
        r = resumir(serie(40, "ifs", lambda i, o: o * M) + serie(40, "aifs", lambda i, o: o * M))
        familias = {x["familia"] for x in r["secundario"]}
        self.assertEqual(familias, {"ocupacion", "ocupacion_v1", "inicio", "inicio_v2", "genesis_F3-4",
                                    "genesis_F3-4-V1"})
        self.assertNotIn("EA", {x["sector"] for x in r["secundario"] if x["familia"] == "ocupacion"})
        self.assertTrue(all("fdr" in x for x in r["secundario"] if not x["solo_recuentos"]))

    def test_diferencia_ifs_aifs_emparejada(self):
        r = resumir(serie(40, "ifs", lambda i, o: o * M) + serie(40, "aifs", lambda i, o: M // 2))
        d = fila(r["ifs_menos_aifs"], sector="EA", paso=1)
        self.assertEqual((d["n"], d["dbs"]), (40, -0.25))
        self.assertLess(d["ic90"][1], 0)


class CalmaV2(unittest.TestCase):
    def test_lo_que_publica_f5_v2(self):
        # 10 pasadas: 4 en calma (A) y calma-V2; 4 solo en calma-V2 (2 de ellas sin calma-V2 en ERA5); 2 en ninguna
        regs = (serie(4, "ifs", lambda i, o: 0) +
                serie(2, "ifs", lambda i, o: 0, inicio="2026-11-01", calma=0) +
                serie(2, "ifs", lambda i, o: 0, inicio="2026-11-03", calma=0, calma_v2_era5=0) +
                serie(2, "ifs", lambda i, o: 0, inicio="2026-11-05", calma=0, calma_v2=0))
        c = fila(resumir(regs)["calma"], modelo="ifs", sector="EA")
        self.assertEqual((c["pasadas"], c["en_calma"], c["en_calma_v2"]), (10, 4, 8))
        self.assertEqual((c["v2_difiere_era5"], c["v2_tambien_en_calma"]), (0.2, 0.5))

    def test_frecuencia_climatologica_por_estacion(self):
        with tempfile.TemporaryDirectory() as d:
            ruta = pathlib.Path(d) / "clima.nc"
            f = np.zeros((len(SECT), 4))
            f[SECT.index("EA")] = [0.1, 0.2, 0.3, 0.4]
            xr.Dataset({"frecuencia_calma_v2_estacion": (("sector", "estacion"), f)},
                       coords={"sector": SECT, "estacion": ["DEF", "MAM", "JJA", "SON"]}).to_netcdf(ruta)
            c = resumen.calma_climatologica(ruta)
        self.assertEqual(c["EA"], {"DEF": 0.1, "MAM": 0.2, "JJA": 0.3, "SON": 0.4})
        self.assertIsNone(resumen.calma_climatologica(pathlib.Path("no_existe.nc")))


class Estaciones(unittest.TestCase):
    def test_solo_con_90_pasadas(self):
        r = resumir(serie(91, "ifs", lambda i, o: o * M, inicio="2026-09-01"))  # 1-09…30-11: SON completo
        self.assertEqual({x["estacion"] for x in r["por_estacion"]}, {"SON"})
        self.assertEqual(fila(r["por_estacion"], sector="EA", paso=1)["n"], 91)
        self.assertEqual(resumir(serie(89, "ifs", lambda i, o: o * M, inicio="2026-09-01"))["por_estacion"], [])


class Determinista(unittest.TestCase):
    def test_mismo_resultado(self):
        regs = serie(40, "ifs", lambda i, o: (i * 7) % (M + 1)) + serie(40, "aifs", lambda i, o: (i * 3) % (M + 1))
        self.assertEqual(resumir(regs), resumir(list(reversed(regs))))


if __name__ == "__main__":
    unittest.main()
