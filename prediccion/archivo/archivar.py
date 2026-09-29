"""PRD-101: archivo diario de Z500 de las previsiones por conjuntos abiertas de ECMWF (IFS ENS y AIFS ENS).

Descarga la pasada de 00 UTC (50 miembros perturbados, 0–360 h cada 24 h) y guarda el hemisferio norte a 1,25°
tomando los nodos de la rejilla de 0,25° (sin interpolar), en int16 con escala de 0,1 m. El servidor de ECMWF solo
conserva unos 2–3 días: lo que no se archiva se pierde.

Uso: python prediccion/archivo/archivar.py [--fecha AAAAMMDD] [--salida DIR] [--modelos ifs aifs]
"""
import argparse
import datetime as dt
import json
import pathlib
import sys
import tempfile

import numpy as np
import xarray as xr

G = 9.80665
PASOS = list(range(0, 361, 24))
MIEMBROS = 50
RESOLUCION = 1.25
# gh en m (IFS); z en m² s⁻² (AIFS), que se pasa a metros dividiendo por g
MODELOS = {
    "ifs": {"model": "ifs", "param": "gh", "factor": 1.0},
    "aifs": {"model": "aifs-ens", "param": "z", "factor": 1 / G},
}
RANGO_M = (4000.0, 6500.0)  # Z500 físico; fuera de aquí son unidades o datos equivocados
ATRIBUCION = ("Contains modified ECMWF open data (IFS/AIFS ensemble, stream enfo), "
              "https://www.ecmwf.int/en/forecasts/datasets/open-data")


def nombre(modelo, fecha):
    return f"z500_{modelo}_ens_{fecha}_00z_hn_1p25.nc"


def reducir(da, factor):
    """Metros, longitudes en [−180, 180), hemisferio norte y nodos cada 1,25° de la rejilla de 0,25°."""
    z = da * factor
    z = z.assign_coords(longitude=((z.longitude + 180) % 360) - 180).sortby("longitude").sortby("latitude",
                                                                                                ascending=False)
    if not (np.allclose(np.diff(z.latitude), -0.25) and np.allclose(np.diff(z.longitude), 0.25)):
        raise ValueError("se esperaba la rejilla de 0,25° de ECMWF open data")
    lat = np.arange(90, -0.01, -RESOLUCION)
    lon = np.arange(-180, 180 - 0.01, RESOLUCION)
    return z.sel(latitude=lat, longitude=lon).transpose("number", "step", "latitude", "longitude")


def validar(z):
    if z.sizes["number"] != MIEMBROS or z.sizes["step"] != len(PASOS):
        raise ValueError(f"se esperaban {MIEMBROS} miembros y {len(PASOS)} pasos; "
                         f"hay {z.sizes['number']} y {z.sizes['step']}")
    comprobar_rango(z)


def comprobar_rango(z):
    minimo, maximo = float(z.min()), float(z.max())
    if not (RANGO_M[0] <= minimo and maximo <= RANGO_M[1]):
        raise ValueError(f"Z500 fuera de rango físico: [{minimo:.1f}, {maximo:.1f}] m")


def escribir(z, ruta, modelo, fecha):
    ds = z.rename("z500").to_dataset()
    ds["z500"].attrs = {"units": "m", "long_name": "geopotential height at 500 hPa"}
    ds.attrs = {"source": f"ECMWF open data, {MODELOS[modelo]['model']} ENS, 00 UTC",
                "license": "CC-BY-4.0", "attribution": ATRIBUCION, "forecast_date": fecha,
                "grid": "HN 0–90°N, 1,25°, nodos de la rejilla de 0,25° sin interpolar",
                "history": f"prediccion/archivo/archivar.py {dt.datetime.now(dt.timezone.utc):%Y-%m-%dT%H:%MZ}"}
    codificacion = {"z500": {"dtype": "int16", "scale_factor": 0.1, "add_offset": 5000.0, "_FillValue": -32768,
                             "zlib": True, "complevel": 5, "shuffle": True}}
    ds.to_netcdf(ruta, encoding=codificacion)


def descargar(modelo, fecha, destino):
    from ecmwf.opendata import Client  # solo hace falta con red; los tests no la importan
    m = MODELOS[modelo]
    Client(source="ecmwf", model=m["model"]).retrieve(date=fecha, time=0, stream="enfo", type="pf", levelist=500,
                                                      param=m["param"], step=PASOS, target=str(destino))


def archivar(modelo, fecha, salida):
    salida.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory() as tmp:
        grib = pathlib.Path(tmp) / f"{modelo}.grib2"
        descargar(modelo, fecha, grib)
        with xr.open_dataset(grib, engine="cfgrib", backend_kwargs={"indexpath": ""}) as ds:
            z = reducir(ds[MODELOS[modelo]["param"]], MODELOS[modelo]["factor"]).load()
    validar(z)
    ruta = salida / nombre(modelo, fecha)
    escribir(z, ruta, modelo, fecha)
    return ruta


def main(argv=None):
    p = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    p.add_argument("--fecha", default=dt.datetime.now(dt.timezone.utc).strftime("%Y%m%d"))
    p.add_argument("--salida", type=pathlib.Path, default=pathlib.Path("archivo"))
    p.add_argument("--modelos", nargs="+", choices=list(MODELOS), default=list(MODELOS))
    a = p.parse_args(argv)
    resumen, fallos = {}, 0
    for modelo in a.modelos:
        try:
            ruta = archivar(modelo, a.fecha, a.salida)
            resumen[modelo] = {"fichero": ruta.name, "MB": round(ruta.stat().st_size / 1e6, 2)}
        except Exception as e:  # un modelo que falla no impide archivar el otro; el código de salida lo delata
            fallos += 1
            resumen[modelo] = {"error": f"{type(e).__name__}: {e}"[:500]}
    print(json.dumps({"fecha": a.fecha, **resumen}, ensure_ascii=False))
    return 1 if fallos else 0


if __name__ == "__main__":
    sys.exit(main())
