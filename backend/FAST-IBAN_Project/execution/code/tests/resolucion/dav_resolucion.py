"""ALG-308b: el test de invariancia a la resolución aplicado a DAV (docs/invariancia_resolucion.md §7-§8).

DAV (Davini et al. 2012) con DAV() de blocktrack v1.1 (Filippucci et al. 2024; commit 6e4dc14), variante instantánea:
GHGS > 0 y GHGN < -10 m/°, sin extensión en longitud, persistencia ni seguimiento; con --ghgs2, además GHGS2 < -5 m/°
(mer_gradient_filter=True), como variante declarada. La máscara se toma en los puntos de la retícula de 1° y se compara
con las mismas métricas y controles que FAST-IBAN (iou_resolucion.py). DAV solo es computable en 30-75°.

Necesita numpy, xarray, scipy, tqdm, netCDF4, matplotlib y cartopy (los importa blocktoolbox.py).
Uso: dav_resolucion.py --blocktrack <dir de blocktoolbox.py> --pasos-dia N [--ghgs2] <ref.nc> <dec2.nc> <avg2.nc> <dec4.nc> <avg4.nc>
"""
import argparse
import json
import os
import sys

import numpy as np
import xarray as xr

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import iou_resolucion as iou  # noqa: E402

TROZO = 30  # pasos por llamada a DAV (cada paso es independiente)


def mascara(ruta, ghgs2):
    """{paso: {(lat, lon)}} de los puntos bloqueados en la retícula de 1°, y el número de pasos."""
    import blocktoolbox as bt

    ds = xr.open_dataset(ruta).rename({"latitude": "lat", "longitude": "lon", "z": "zg"}).sortby("lat")  # DAV pide lat ascendente
    enteros_lat = np.isclose(ds.lat % 1, 0)
    enteros_lon = np.isclose(ds.lon % 1, 0)
    salida = {}
    for inicio in range(0, ds.sizes["time"], TROZO):
        trozo = ds.isel(time=slice(inicio, inicio + TROZO)).load()
        # blocktrack pasa a altura si el primer valor supera 10000: todo el trozo debe ser geopotencial (m²/s²).
        if float(trozo.zg.min()) <= 10000:
            sys.exit(f"{ruta}: se esperaba geopotencial en m²/s² en todos los puntos")
        dav = bt.DAV(trozo, mer_gradient_filter=ghgs2)["DAV"].isel(lat=enteros_lat, lon=enteros_lon)
        for t, i, j in zip(*np.nonzero(dav.values)):
            salida.setdefault(inicio + int(t), set()).add(iou.clave(float(dav.lat[i]), float(dav.lon[j])))
    return salida, ds.sizes["time"]


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--blocktrack", required=True)
    p.add_argument("--pasos-dia", type=int, required=True)
    p.add_argument("--ghgs2", action="store_true")
    p.add_argument("ficheros", nargs=5)
    a = p.parse_args()
    sys.path.insert(0, a.blocktrack)
    ref, n = mascara(a.ficheros[0], a.ghgs2)
    bloque = 5 * a.pasos_dia
    r = {"persistencia": iou._metricas_conjuntos(ref, ref, range(n - 1), 1, bloque)}
    for nombre, ruta in zip(("dec2", "avg2", "dec4", "avg4"), a.ficheros[1:]):
        r[nombre] = iou._metricas_conjuntos(ref, mascara(ruta, a.ghgs2)[0], range(n), 0, bloque)
    print(json.dumps(r, indent=1, sort_keys=True))


if __name__ == "__main__":
    main()
