"""Rutas y nombres de los ficheros que descarga el configurador (ALG-369).

Vive aparte de configurator_CLI.py para que se pueda importar sin arrastrar RabbitMQ ni el resto del sistema: así
la prueba de extremo a extremo puede preguntar dónde espera el configurador cada fichero en vez de duplicar aquí la
fórmula del margen (WEB-359).
"""

import math
import sys

sys.path.append("/app/")

from utils.consts.consts import API_FOLDER  # noqa: E402


# ALG-369: el geopotencial se descarga con un margen alrededor del área pedida para que los rayos de clasificación de
# los candidatos de los bordes (ray_distance_km) tengan datos; el núcleo C solo informa dentro del área pedida.
# RAY_DISTANCE_KM debe coincidir con execution/code/config/params.yaml (lo comprueba test_configurator.py).
RAY_DISTANCE_KM = 500
KM_POR_GRADO = 111.195
RES_ERA5 = 0.25
LAT_CIRCULO_COMPLETO = 80  # a partir de aquí el margen en longitud es tan grande que se descarga el círculo completo


def area_de_descarga(area: list, variable: str) -> list:
    """Área [N, O, S, E] ampliada en el margen de los rayos, en grados enteros para que la retícula de candidatos siga
    anclada a los grados enteros. En longitud el margen crece con 1/cos de la latitud más polar pedida; si pasa del
    antimeridiano o el área llega a LAT_CIRCULO_COMPLETO, se descarga toda la vuelta. Solo el geopotencial (el núcleo
    de temperatura no usa rayos)."""
    if variable.lower() != "geopotential":
        return area
    norte, oeste, sur, este = (float(v) for v in area)
    margen = RAY_DISTANCE_KM / KM_POR_GRADO + RES_ERA5
    polar = max(abs(norte), abs(sur))
    norte, sur = min(90, norte + math.ceil(margen)), max(-90, sur - math.ceil(margen))
    margen_lon = math.ceil(margen / math.cos(math.radians(polar))) if polar < LAT_CIRCULO_COMPLETO else 360
    oeste, este = oeste - margen_lon, este + margen_lon
    if oeste < -180 or este > 180:
        oeste, este = -180, 180
    return [str(int(v)) for v in (norte, oeste, sur, este)]


def format_range(values: list) -> str:
    """Transform a list of values into a range if they are consecutive or list them."""

    if not values:
        return ""

    values = sorted(map(int, values))
    ranges = []
    start = values[0]

    for i in range(1, len(values)):
        if values[i] != values[i - 1] + 1:
            ranges.append((start, values[i - 1]))
            start = values[i]

    ranges.append((start, values[-1]))

    return "-".join(f"{s:02d}" if s == e else f"{s:02d}-{e:02d}" for s, e in ranges)


def format_list(values: list) -> list:
    """Transform a list of values into a list of strings with leading zeros."""
    return [f"{int(v):02d}" for v in values]


def mount_file_name(args: dict, area: list) -> str:
    """Generate the name of the file based on the parameters provided. ALG-369: the downloaded area goes in the
    directory, so requests for different areas do not share a file (the base name is parsed elsewhere, unchanged)."""

    # Asign default values
    variable = args["variableName"] or ""
    pressure_levels = args["pressureLevels"] or []
    years = format_list(args["years"] or [])
    months = format_list(args["months"] or [])
    days = format_list(args["days"] or [])
    hours = format_list(args["hours"] or [])

    # Mount the new file name
    pressure_part = (
        "-".join(pressure_levels) + "hPa"
        if len(pressure_levels) > 1
        else pressure_levels[0] + "hPa"
    )
    year_part = "-".join(years)
    month_part = "-".join(months)
    day_part = f"({format_range(days)})"
    hour_part = "-".join(hours) + "UTC"

    return f"{API_FOLDER}/area_{'_'.join(area)}/{variable}_{pressure_part}_{year_part}-{month_part}-{day_part}_{hour_part}.nc"
