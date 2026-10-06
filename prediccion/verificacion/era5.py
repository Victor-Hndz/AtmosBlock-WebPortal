"""PRD-504: archivo diario de ERA5 Z500 a 00 UTC, la verdad de la verificación (F5; D12, descarga automática).

Descarga del CDS (reanalysis-era5-pressure-levels; credenciales en CDSAPI_URL y CDSAPI_KEY, que lee cdsapi) un día a
00 UTC en el hemisferio norte y lo guarda como el archivo de la ENS: nodos de 1,25° de la rejilla de 0,25°, sin
interpolar, en int16 con 0,1 m. ERA5 llega con unos 5 días de retraso como ERA5T (preliminar): se archiva la primera
versión disponible y no se sustituye por la final.

Uso: python prediccion/verificacion/era5.py --fecha AAAAMMDD [--salida DIR]
"""
import argparse
import datetime as dt
import pathlib
import sys
import tempfile

import numpy as np
import xarray as xr

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1] / "archivo"))
import archivar as archivo_ens  # noqa: E402

DATASET = "reanalysis-era5-pressure-levels"
ATRIBUCION = "Contains modified Copernicus Climate Change Service information (ERA5)"
G = archivo_ens.G


def nombre(fecha):
    return f"z500_era5_{fecha}_00z_hn_1p25.nc"


def peticion(fecha):
    return {"product_type": ["reanalysis"], "variable": ["geopotential"], "year": [fecha[:4]],
            "month": [fecha[4:6]], "day": [fecha[6:]], "time": ["00:00"], "pressure_level": ["500"],
            "data_format": "netcdf", "download_format": "unarchived", "area": [90, -180, 0, 180]}


def reducir(ds, fecha):
    """(time=1, latitude 90→0, longitude −180…178,75) en m, con los nodos de 1,25° de la rejilla de 0,25°."""
    z = ds["z"].squeeze(drop=True) / G
    z = z.assign_coords(longitude=((z.longitude + 180) % 360) - 180).drop_duplicates("longitude")
    z = z.sortby("longitude").sortby("latitude", ascending=False)
    if not (np.allclose(np.diff(z.latitude), -0.25) and np.allclose(np.diff(z.longitude), 0.25)):
        raise ValueError("se esperaba la rejilla de 0,25° de ERA5")
    z = z.sel(latitude=np.arange(90, -0.01, -archivo_ens.RESOLUCION),
              longitude=np.arange(-180, 180 - 0.01, archivo_ens.RESOLUCION))
    return z.expand_dims(time=[np.datetime64(f"{fecha[:4]}-{fecha[4:6]}-{fecha[6:]}")])


def comprobar_rango(z):
    archivo_ens.comprobar_rango(z)


def descargar(fecha, destino):
    import cdsapi  # solo hace falta con red; los tests no lo importan
    cdsapi.Client().retrieve(DATASET, peticion(fecha), str(destino))


def archivar(fecha, salida):
    salida.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory() as tmp:
        crudo = pathlib.Path(tmp) / "era5.nc"
        descargar(fecha, crudo)
        with xr.open_dataset(crudo) as ds:
            z = reducir(ds, fecha).load()
    comprobar_rango(z)
    ds = z.rename("z500").to_dataset()
    ds["z500"].attrs = {"units": "m", "long_name": "geopotential height at 500 hPa"}
    ds.attrs = {"source": f"ERA5 ({DATASET}), 00 UTC; primera versión disponible (ERA5T)", "attribution": ATRIBUCION,
                "grid": "HN 0–90°N, 1,25°, nodos de la rejilla de 0,25° sin interpolar",
                "history": f"prediccion/verificacion/era5.py {dt.datetime.now(dt.timezone.utc):%Y-%m-%dT%H:%MZ}"}
    ruta = salida / nombre(fecha)
    ds.to_netcdf(ruta, encoding={"z500": archivo_ens.CODIFICACION})
    return ruta


def main(argv=None):
    p = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    p.add_argument("--fecha", required=True)
    p.add_argument("--salida", type=pathlib.Path, default=pathlib.Path("era5"))
    a = p.parse_args(argv)
    try:
        print(archivar(a.fecha, a.salida))
        return 0
    except Exception as e:  # el script del workflow decide si es un aviso o un error según la fecha
        print(f"{a.fecha}: {type(e).__name__}: {e}"[:500], file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
