import cdsapi

PRODUCT_TYPE = "reanalysis"
DATASET = "reanalysis-era5-pressure-levels"
DOWNLOAD_FORMAT = "unarchived"
DATA_FORMAT = "netcdf"


def request_data(variable, years, months, days, hours, pressure_levels, file_name):
    """Request data from the CDS API and save it to a file."""

    try:
        request = {
            "product_type": [PRODUCT_TYPE],
            "variable": variable,
            "year": years,
            "month": months,
            "day": days,
            "time": hours,
            "pressure_level": pressure_levels,
            "data_format": DATA_FORMAT,
            "download_format": DOWNLOAD_FORMAT,
            "area": [90, -180, -90, 180],  # North, West, South, East. Global coverage
        }
        print(f"Request: {request}")

        client = cdsapi.Client()

        # Put the file in /app/config/data
        client.retrieve(DATASET, request, file_name)
    except Exception as e:
        print(f"Error en la petición de datos: {e}")
