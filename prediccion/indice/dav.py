"""PRD-201: índice de bloqueo instantáneo de Davini et al. (2012) por miembro y paso de la ENS archivada.

Reproduce DAV() de blocktrack v1.1 (Filippucci et al. 2024, commit 6e4dc14) en el HN a 2,5°, entre 30 y 75°N, con
Δ = 15°. Salida principal: GHGS > 0 y GHGN < −10 m/°lat (sin GHGS2, como blocktrack y MiLES); variante: además
GHGS2 < −5 m/°lat. La probabilidad es la fracción de miembros con la celda bloqueada. Sin persistencia ni eventos: F3.

Uso: python prediccion/indice/dav.py <z500_..._hn_1p25.nc> <salida.nc>
"""
import argparse
import sys

import numpy as np
import xarray as xr

RESOLUCION = 2.5
DELTA = 15.0
FILAS = int(DELTA / RESOLUCION)
LAT_MIN, LAT_MAX = 30.0, 75.0


def a_2p5(z):
    """Nodos de la rejilla de 2,5° (lat 0→90, lon −180→177,5), sin interpolar."""
    z = z.sortby("latitude")
    return z.sel(latitude=np.arange(0, 90.01, RESOLUCION), longitude=np.arange(-180, 180, RESOLUCION))


def mascara(z, ghgs2=False):
    """1 donde hay bloqueo instantáneo de Davini; z en m a 2,5° con dimensiones (..., latitude, longitude)."""
    z = z.sortby("latitude")
    if not np.allclose(np.diff(z.latitude), RESOLUCION) or float(z.latitude[0]) != 0.0:
        raise ValueError("DAV necesita la rejilla de 2,5° desde 0°N (usar a_2p5)")
    v = z.values
    i0, i1 = int(LAT_MIN / RESOLUCION), int(LAT_MAX / RESOLUCION) + 1
    centro = v[..., i0:i1, :]
    ghgs = (centro - v[..., i0 - FILAS:i1 - FILAS, :]) / DELTA
    ghgn = (v[..., i0 + FILAS:i1 + FILAS, :] - centro) / DELTA
    bloqueo = (ghgn < -10.0) & (ghgs > 0.0)
    if ghgs2:
        bloqueo &= (v[..., i0 - FILAS:i1 - FILAS, :] - v[..., i0 - 2 * FILAS:i1 - 2 * FILAS, :]) / DELTA < -5.0
    m = np.zeros(v.shape, dtype=np.uint8)
    m[..., i0:i1, :] = bloqueo
    return z.copy(data=m)


def probabilidad(m):
    return m.mean("number", dtype="float32")


def main(argv=None):
    p = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    p.add_argument("entrada")
    p.add_argument("salida")
    a = p.parse_args(argv)
    with xr.open_dataset(a.entrada) as ds:
        z = a_2p5(ds["z500"]).load()
        attrs = dict(ds.attrs)
    m, m2 = mascara(z), mascara(z, ghgs2=True)
    salida = xr.Dataset({"dav": m, "probabilidad": probabilidad(m),
                         "dav_ghgs2": m2, "probabilidad_ghgs2": probabilidad(m2)}, attrs=attrs)
    salida.attrs.update(
        indice="Davini et al. (2012), bloqueo instantáneo; reproduce DAV() de blocktrack v1.1. dav: GHGS > 0 y "
               "GHGN < -10 m/°lat (principal, sin GHGS2, como blocktrack y MiLES InstBlock); dav_ghgs2: además "
               "GHGS2 < -5 m/°lat. En 30-40°N la principal incluye bloqueo de baja latitud (LLB)",
        rejilla="2,5° tomando nodos de la rejilla del archivo, sin interpolar (equivale a bilineal en nodos coincidentes)",
        tiempo="Z500 instantánea en el tiempo de validez de 00 UTC de cada paso de 24 h, no la media diaria de "
               "Davini et al. (2012); la verificación usa ERA5 a 00 UTC con el mismo procesado",
        origen=str(a.entrada))
    cod = {v: {"zlib": True, "complevel": 4} for v in salida.data_vars}
    salida.to_netcdf(a.salida, encoding=cod)
    return 0


if __name__ == "__main__":
    sys.exit(main())
