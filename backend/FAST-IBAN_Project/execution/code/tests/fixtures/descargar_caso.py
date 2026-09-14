"""Descarga y prepara el caso fijo de referencia (ALG-002).

Z500 de ERA5 del 2022-03-14 a 00/06/12/18 UTC, de 90N a 0 y toda la vuelta en longitud,
convertido con el mismo `adapt_netcdf` que usa el pipeline y comprimido sin tocar los valores.

Uso (en Docker, con la clave del CDS montada solo en lectura):
    docker run --rm -v <repo>:/src -v <home>/.cdsapirc:/root/.cdsapirc:ro python:3.11-slim \
        sh -c "pip install -q cdsapi xarray netCDF4 && python /src/backend/FAST-IBAN_Project/execution/code/tests/fixtures/descargar_caso.py"
"""
import os
import sys

import xarray as xr

AQUI = os.path.dirname(os.path.abspath(__file__))
sys.path.append(os.path.join(AQUI, "..", "..", "..", ".."))  # backend/FAST-IBAN_Project

from utils.api_request import request_data  # noqa: E402
from utils.netcdf_editor import adapt_netcdf  # noqa: E402

DESTINO = os.path.join(AQUI, "geopot_500hPa_2022-03-14_00-06-12-18UTC.nc")


def main():
    crudo = DESTINO + ".crudo.nc"
    request_data("geopotential", ["2022"], ["03"], ["14"],
                 ["00:00", "06:00", "12:00", "18:00"], ["500"], [90, -180, 0, 180], crudo)
    adapt_netcdf(crudo)

    # Recomprimir: mask_and_scale=False mantiene los int16 y sus atributos tal cual.
    with xr.open_dataset(crudo, mask_and_scale=False) as ds:
        ds.load().to_netcdf(DESTINO, encoding={"z": {"zlib": True, "complevel": 9}})
    os.remove(crudo)
    print(f"Caso guardado en {DESTINO} ({os.path.getsize(DESTINO) / 1e6:.2f} MB)")


if __name__ == "__main__":
    main()
