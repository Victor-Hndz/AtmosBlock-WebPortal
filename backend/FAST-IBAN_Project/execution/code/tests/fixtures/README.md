# Caso fijo de referencia

`geopot_500hPa_2022-03-14_00-06-12-18UTC.nc`: geopotencial en 500 hPa del 14 de marzo de 2022
a 00, 06, 12 y 18 UTC, de 90°N a 0° y de 180°W a 180°E, rejilla de 0,25°.

- **Uso:** entrada del test de regresión por hash (`../regression/run_baseline.sh`).
- **Cómo se generó:** `descargar_caso.py` descarga los datos del CDS y los convierte con
  `utils/netcdf_editor.py`, igual que el pipeline (int16 con `scale_factor`/`add_offset`). Luego los
  recomprime con zlib sin cambiar los valores. No lo regeneres salvo que cambie el formato de
  entrada: la línea base de hashes depende de este fichero exacto.

## Caso de orden de clusters

`geopot_500hPa_2003-08-14-15_18-00UTC.nc`: mismo formato y dominio, dos pasos (2003-08-14 18 UTC y
2003-08-15 00 UTC).

- **Uso:** entrada de `invariancia_orden` (`../regression/run_orden.sh`, ALG-108).
- **Por qué estos pasos:** son dos de los 6 pasos del periodo 2003-08-01…15 en los que las formaciones
  cambiaban al invertir el orden de los clusters (B5). El caso del 2022-03-14 no lo ejercita.
- **Cómo se generó:** se descargó ese periodo como el caso anterior y se recortaron los pasos 55 y 56
  con `xarray` (`open_dataset(..., mask_and_scale=False)`, `isel(time=[55, 56])`), recomprimiendo con
  zlib sin tocar los valores.

## Atribución

Contiene información modificada del Copernicus Climate Change Service (2026).

Hersbach, H., Bell, B., Berrisford, P., et al. (2023): ERA5 hourly data on pressure levels from
1940 to present. Copernicus Climate Change Service (C3S) Climate Data Store (CDS).
DOI: [10.24381/cds.bd0915c6](https://doi.org/10.24381/cds.bd0915c6)

Ni la Comisión Europea ni el ECMWF son responsables del uso que se haga de esta información.
Licencia: [CC-BY 4.0](https://creativecommons.org/licenses/by/4.0/).
