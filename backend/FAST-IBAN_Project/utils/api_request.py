import cdsapi

dataset = "reanalysis-era5-pressure-levels"
request = {
    "product_type": ["reanalysis"],
    "variable": ["geopotential"],
    "year": ["1940"],
    "month": ["10"],
    "day": ["01"],
    "time": [
        "00:00", "06:00", "12:00",
        "18:00"
    ],
    "pressure_level": ["550"],
    "data_format": "netcdf",
    "download_format": "unarchived"
}

client = cdsapi.Client()
# Put the file in /app/config/data
client.retrieve(dataset, request, 'config/data/era5.nc')
