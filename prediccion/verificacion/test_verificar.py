"""PRD-504: registro de verificación de una pasada (producto + verdad ERA5 + climatología), sin red.

Uso: python prediccion/verificacion/test_verificar.py
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
import test_producto as tp  # noqa: E402
import test_verdad as tv  # noqa: E402
import producto  # noqa: E402
import verdad  # noqa: E402
import verificar  # noqa: E402

D = np.datetime64("2010-07-06")  # pasada; la ventana ERA5 de test_verdad es 2010-07-02…07-21


def climatologia():
    """Climatología sintética: cada probabilidad vale día_del_año / 1000 (la de V1, / 2000; la de inicio V2, / 4000)."""
    sect, doy = list(producto.sectores.SECTORES), np.arange(1, 367)
    base = np.broadcast_to(doy / 1000, (len(sect), 16, 366))
    return xr.Dataset(
        {"prob_bloqueo": (("sector", "paso", "dia_del_anio"), base),
         "prob_bloqueo_v1": (("sector", "paso", "dia_del_anio"), base / 2),
         "prob_inicio": (("sector", "ventana", "dia_del_anio"), np.broadcast_to(doy / 1000, (len(sect), 2, 366))),
         "prob_inicio_v2": (("sector", "ventana", "dia_del_anio"), np.broadcast_to(doy / 4000, (len(sect), 2, 366))),
         "prob_genesis": (("regla", "sector", "ventana", "dia_del_anio"),
                          np.broadcast_to(doy / 1000, (2, len(sect), 2, 366)))},
        coords={"sector": sect, "paso": np.arange(16), "ventana": list(producto.VENTANAS),
                "regla": list(producto.REGLAS), "dia_del_anio": doy})


def pasada():
    # 3 miembros: dos con un bloqueo en EA en los pasos 3–10 (inicio y génesis en el 3), uno sin bloqueo
    prod = producto.calcular(tp.miembros([set(range(3, 11)), set(range(3, 11)), set()]), tp.historia([False] * 4),
                             tp.analisis_d())
    v = verdad.verdad(tv.era5(set(range(8, 16))), D)  # la verdad: bloqueo del paso 3 al 10
    return prod, v


class Registro(unittest.TestCase):
    def setUp(self):
        prod, v = pasada()
        self.r = verificar.registro(prod, v, climatologia(), D)

    def test_cuenta_miembros_y_verdad(self):
        ea = self.r.sel(sector="EA")
        self.assertEqual(int(self.r["miembros"]), 3)
        np.testing.assert_array_equal(ea["k"][[2, 3, 10, 11]], [0, 2, 2, 0])
        np.testing.assert_array_equal(ea["obs"][[2, 3, 10, 11]], [0, 1, 1, 0])
        np.testing.assert_array_equal(ea["k_v1"][3:11], np.full(8, 2))

    def test_inicio_y_genesis_por_ventana(self):
        ea = self.r.sel(sector="EA")
        np.testing.assert_array_equal(ea["k_inicio"], [2, 0])
        np.testing.assert_array_equal(ea["obs_inicio"], [1, 0])
        self.assertEqual(int(ea["calma"]), 1)
        self.assertEqual((int(ea["calma_v2"]), int(ea["calma_v2_era5"])), (1, 1))  # variante V2
        np.testing.assert_array_equal(ea["k_genesis"].sel(regla="F3-4"), [2, 0])
        np.testing.assert_array_equal(ea["obs_genesis"].sel(regla="F3-4"), [1, 0])

    def test_climatologia_en_la_fecha_de_validez(self):
        # 2010-07-06 es el día 187 del año; el paso s se valida el día 187 + s
        ea = self.r.sel(sector="EA")
        np.testing.assert_allclose(ea["clim"][[0, 15]], [0.187, 0.202])
        np.testing.assert_allclose(ea["clim_v1"][0], 0.0935)
        np.testing.assert_allclose(ea["clim_inicio"], [0.187, 0.187])
        np.testing.assert_allclose(ea["clim_inicio_v2"], [0.04675, 0.04675])
        np.testing.assert_allclose(ea["clim_genesis"].sel(regla="F3-4-V1"), [0.187, 0.187])

    def test_marcas(self):
        self.assertEqual(int(self.r["historia_incompleta"]), 0)
        self.assertEqual(self.r.attrs["fecha"], "2010-07-06")


class Main(unittest.TestCase):
    def test_escribe_el_registro(self):
        prod, _ = pasada()
        with tempfile.TemporaryDirectory() as d:
            d = pathlib.Path(d)
            prod.to_netcdf(d / "producto_ifs_20100706.nc")
            z = tv.era5(set(range(8, 16)), geopotencial=False)
            for t in z.time.values:
                f = str(t)[:10].replace("-", "")
                z.sel(time=[t]).rename("z500").to_dataset().to_netcdf(d / f"z500_era5_{f}_00z_hn_1p25.nc")
            climatologia().to_netcdf(d / "clima.nc")
            argumentos = ["--fecha", "20100706", "--modelo", "ifs", "--producto", str(d), "--era5", str(d),
                          "--climatologia", str(d / "clima.nc"), "--salida", str(d / "sal")]
            self.assertEqual(verificar.main(argumentos), 0)
            with xr.open_dataset(d / "sal" / "verificacion_ifs_20100706.nc") as r:
                self.assertEqual(int(r["k"].sel(sector="EA", paso=3)), 2)
                self.assertEqual(r.attrs["modelo"], "ifs")

    def test_falta_era5_no_es_un_error_sino_pendiente(self):
        prod, _ = pasada()
        with tempfile.TemporaryDirectory() as d:
            d = pathlib.Path(d)
            prod.to_netcdf(d / "producto_ifs_20100706.nc")
            climatologia().to_netcdf(d / "clima.nc")
            argumentos = ["--fecha", "20100706", "--modelo", "ifs", "--producto", str(d), "--era5", str(d),
                          "--climatologia", str(d / "clima.nc"), "--salida", str(d / "sal")]
            self.assertEqual(verificar.main(argumentos), verificar.PENDIENTE)


if __name__ == "__main__":
    unittest.main()
