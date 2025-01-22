import xarray as xr
import numpy as np

scale_factor = 0.2143160459234279
add_offset = 51692.04909197704

# Cargar el archivo NetCDF
# ruta_archivo = "../config/data/geopot_500hPa_2024-10-(29-31)_00-06-12-18UTC.nc"
ruta_archivo = "1dd1057d053e1fc4cbdb1c502fa78ce.nc"
ds = xr.open_dataset(ruta_archivo)

# Renombrar la variable valid_time a time
ds = ds.rename({"valid_time": "time"})

# Eliminar la dimensión pressure_level
ds.drop_dims("pressure_level")

# # Eliminar las variables expver, number, y pressure_level
ds = ds.drop_vars(["expver", "number", "pressure_level"])


# Modificar las dimensiones de la variable z para quitar la dimensión pressure_level
if "z" in ds:
    ds["z"] = ds["z"].isel(pressure_level=0)
    
    #transformar z de float a short usando: scale_factor = 0.18962559893488776; // double y add_offset = 51940.39346845053; // double
    ds["z"] = (ds["z"]-add_offset)/scale_factor
    ds["z"] = ds["z"].astype("int16")  # Cambiar el tipo de datos a int16
    ds["z"].attrs["scale_factor"] = scale_factor
    ds["z"].attrs["add_offset"] = add_offset
    ds["z"].attrs["long_name"] = "Geopotential"

# print(ds["z"])


# Guardar el archivo NetCDF modificado
# ruta_salida = "geopot_500hPa_2024-10-(29-31)_00-06-12-18UTC.nc"
ruta_salida = "out.nc"
ds.to_netcdf(ruta_salida)

print(f"Archivo modificado guardado en {ruta_salida}")
