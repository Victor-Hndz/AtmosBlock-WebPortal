"""PRD-506: resumen de puntuaciones sobre los registros de verificación (F5 preregistrado y V1), sin red.

Uso: python prediccion/verificacion/test_resumen.py
"""
import pathlib
import sys
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


def registro(fecha, modelo, k, obs, clim, calma=1, k_inicio=0, obs_inicio=0, historia_incompleta=0):
    """Registro con el mismo valor en todos los sectores y pasos (k miembros, verdad obs, climatología clim)."""
    s, p, v, r = len(SECT), 16, 2, 2
    lleno = lambda forma, x: np.full(forma, x)  # noqa: E731
    return xr.Dataset(
        {"miembros": M, "k": (("sector", "paso"), lleno((s, p), k)), "obs": (("sector", "paso"), lleno((s, p), obs)),
         "k_v1": (("sector", "paso"), lleno((s, p), k)), "obs_v1": (("sector", "paso"), lleno((s, p), obs)),
         "clim": (("sector", "paso"), lleno((s, p), clim)), "clim_v1": (("sector", "paso"), lleno((s, p), clim)),
         "calma": (("sector",), lleno(s, calma)), "calma_era5": (("sector",), lleno(s, calma)),
         "k_inicio": (("sector", "ventana"), lleno((s, v), k_inicio)),
         "obs_inicio": (("sector", "ventana"), lleno((s, v), obs_inicio)),
         "clim_inicio": (("sector", "ventana"), lleno((s, v), clim)),
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


class Secundario(unittest.TestCase):
    def test_inicios_solo_con_calma_y_con_10_observados(self):
        pocos = serie(30, "ifs", lambda i, o: 0, k_inicio=M, obs_inicio=1)[:9] + \
            serie(30, "ifs", lambda i, o: 0, inicio="2026-11-01", calma=0, k_inicio=M, obs_inicio=1)
        f = fila(resumir(pocos)["secundario"], familia="inicio", modelo="ifs", sector="EA", ventana="dias_1_5")
        self.assertEqual((f["n"], f["sucesos"], f["solo_recuentos"]), (9, 9, True))
        self.assertIsNone(f["bss"])

    def test_familias_y_fdr(self):
        r = resumir(serie(40, "ifs", lambda i, o: o * M) + serie(40, "aifs", lambda i, o: o * M))
        familias = {x["familia"] for x in r["secundario"]}
        self.assertEqual(familias, {"ocupacion", "ocupacion_v1", "inicio", "genesis_F3-4", "genesis_F3-4-V1"})
        self.assertNotIn("EA", {x["sector"] for x in r["secundario"] if x["familia"] == "ocupacion"})
        self.assertTrue(all("fdr" in x for x in r["secundario"] if not x["solo_recuentos"]))

    def test_diferencia_ifs_aifs_emparejada(self):
        r = resumir(serie(40, "ifs", lambda i, o: o * M) + serie(40, "aifs", lambda i, o: M // 2))
        d = fila(r["ifs_menos_aifs"], sector="EA", paso=1)
        self.assertEqual((d["n"], d["dbs"]), (40, -0.25))
        self.assertLess(d["ic90"][1], 0)


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
