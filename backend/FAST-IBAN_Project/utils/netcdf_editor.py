import xarray as xr
import os

SCALE_FACTOR_Z = 0.2143160459234279
ADD_OFFSET_Z = 51692.04909197704

SCALE_FACTOR_T = 0.0013736749709324643
ADD_OFFSET_T = 268.35169200772935


def adapt_netcdf(ruta_archivo: str) -> None:
    """Format the netcdf file to the correct format for the model"""

    ds = xr.open_dataset(ruta_archivo)

    if "valid_time" in ds:
        ds = ds.rename({"valid_time": "time"})

        ds.drop_dims("pressure_level")
        ds = ds.drop_vars(["expver", "number", "pressure_level"])

        if "z" in ds:
            ds["z"] = ds["z"].isel(pressure_level=0)

            ds["z"] = (ds["z"] - ADD_OFFSET_Z) / SCALE_FACTOR_Z
            ds["z"] = ds["z"].astype("int16")
            ds["z"].attrs["scale_factor"] = SCALE_FACTOR_Z
            ds["z"].attrs["add_offset"] = ADD_OFFSET_Z
            ds["z"].attrs["long_name"] = "Geopotential"
        
        if "t" in ds:
            ds["t"] = ds["t"].isel(pressure_level=0)

            ds["t"] = (ds["t"] - ADD_OFFSET_T) / SCALE_FACTOR_T
            ds["t"] = ds["t"].astype("int16")
            ds["t"].attrs["scale_factor"] = SCALE_FACTOR_T
            ds["t"].attrs["add_offset"] = ADD_OFFSET_T
            ds["t"].attrs["long_name"] = "Temperature"

        os.remove(ruta_archivo)

        ruta_salida = ruta_archivo
        ds.to_netcdf(ruta_salida)

        print(f"Archivo modificado guardado en {ruta_salida}")
    else:
        print("El archivo está en el formato correcto")
