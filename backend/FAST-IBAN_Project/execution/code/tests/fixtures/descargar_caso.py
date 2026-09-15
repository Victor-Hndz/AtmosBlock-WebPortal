"""Descarga y prepara un caso fijo de referencia (ALG-002 geopotencial, ALG-112 temperatura).

ERA5 a 00/06/12/18 UTC, de 90N a 0 y toda la vuelta en longitud, convertido con el mismo
`adapt_netcdf` que usa el pipeline y comprimido sin tocar los valores.

- geopotential (por defecto): geopot_500hPa_2022-03-14_00-06-12-18UTC.nc (núcleo de code/)
- temperature: temp_850hPa_2019-06-28_00-06-12-18UTC.nc (núcleo de code_t/). A 850 hPa y en plena ola
  de calor, porque code_t solo selecciona puntos por encima de 28 °C: a 500 hPa no seleccionaría ninguno.

Uso (en Docker, con la clave del CDS montada solo en lectura):
    docker run --rm -v <repo>:/src -v <home>/.cdsapirc:/root/.cdsapirc:ro python:3.11-slim \
        sh -c "pip install -q cdsapi xarray netCDF4 && python /src/backend/FAST-IBAN_Project/execution/code/tests/fixtures/descargar_caso.py [geopotential|temperature]"
"""
import os
import sys

import xarray as xr

AQUI = os.path.dirname(os.path.abspath(__file__))
sys.path.append(os.path.join(AQUI, "..", "..", "..", ".."))  # backend/FAST-IBAN_Project

from utils.api_request import request_data  # noqa: E402
from utils.netcdf_editor import adapt_netcdf  # noqa: E402

# variable del CDS -> (prefijo del fichero, variable en el NetCDF, nivel en hPa, (año, mes, día))
CASOS = {
    "geopotential": ("geopot", "z", "500", ("2022", "03", "14")),
    "temperature": ("temp", "t", "850", ("2019", "06", "28")),
}


def main():
    variable = sys.argv[1] if len(sys.argv) > 1 else "geopotential"
    prefijo, nombre_nc, nivel, (anio, mes, dia) = CASOS[variable]
    destino = os.path.join(AQUI, f"{prefijo}_{nivel}hPa_{anio}-{mes}-{dia}_00-06-12-18UTC.nc")
    crudo = destino + ".crudo.nc"

    request_data(variable, [anio], [mes], [dia],
                 ["00:00", "06:00", "12:00", "18:00"], [nivel], [90, -180, 0, 180], crudo)
    adapt_netcdf(crudo)

    # Recomprimir: mask_and_scale=False mantiene los int16 y sus atributos tal cual.
    with xr.open_dataset(crudo, mask_and_scale=False) as ds:
        ds.load().to_netcdf(destino, encoding={nombre_nc: {"zlib": True, "complevel": 9}})
    os.remove(crudo)
    print(f"Caso guardado en {destino} ({os.path.getsize(destino) / 1e6:.2f} MB)")


if __name__ == "__main__":
    main()
