import math
import os
import sys
import asyncio

sys.path.append("/app/")

from utils.api_request import request_data
from utils.netcdf_editor import adapt_netcdf
from utils.rabbitMQ.rabbitmq import RabbitMQ
from utils.rabbitMQ.process_body import process_body
from utils.rabbitMQ.create_message import create_message
from utils.rabbitMQ.notify_updates import notify_update
from utils.rabbitMQ.notify_results import notify_result
from utils.rabbitMQ.rabbit_consts import CONFIG_QUEUE, REQUESTS_EXCHANGE, HANDLER_START_KEY
from utils.consts.consts import API_FOLDER, ARGUMENTS, STATUS_OK, STATUS_ERROR


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


class Configurator:
    """
    Class for handling the configuration of the application.

    This class is responsible for processing messages from RabbitMQ, validating arguments,
    and generating the configuration file for the handler. It keeps no per-request state:
    several requests can be in progress at once (WEB-222).
    """

    def __init__(self, rabbitmq_client: RabbitMQ):
        self.rabbitmq = rabbitmq_client

    async def process_message(self, body: bytes) -> None:
        """
        Process a configuration message and begin the orchestration flow.

        Args:
            body: Raw message body from RabbitMQ
        """

        config = process_body(body)
        args = {key: config.get(key, None) for key in ARGUMENTS}

        # WEB-221: a failed download or preparation ends the request as failed instead of leaving it
        # waiting forever (the consumer wrapper only logs exceptions).
        try:
            await self.prepare_request(args)
        except Exception as e:
            print(f"\n❌ Error al preparar los datos: {e}")
            await notify_result(self.rabbitmq, f"Error al preparar los datos: {e}", args["requestHash"], STATUS_ERROR)

    async def prepare_request(self, args: dict) -> None:
        """Download and adapt the NetCDF file of a request, then send its configuration to the handler."""

        request_hash = args["requestHash"]
        print("\n✅ Argumentos cargados y validados con éxito.\n")
        print(f"Argumentos: {args}")

        await notify_update(self.rabbitmq, request_hash, 1, "CONFIG: argumentos recibidos con éxito.")

        area = area_de_descarga(args["areaCovered"], args["variableName"] or "")
        file_name = mount_file_name(args, area)

        if not os.path.exists(file_name):
            os.makedirs(os.path.dirname(file_name), exist_ok=True)
            # call to API for dowload the file
            print(f"El archivo {file_name} no existe, se procederá a descargarlo.")
            request_data(
                args["variableName"],
                args["years"],
                args["months"],
                args["days"],
                args["hours"],
                args["pressureLevels"],
                area,
                file_name,
            )
            print(f"\n✅ Archivo {file_name} descargado con éxito.")

        await notify_update(self.rabbitmq, request_hash, 1, "CONFIG: descarga del archivo NetCDF realizada con éxito.")


        adapt_netcdf(file_name)
        print(f"\n✅ Archivo {file_name} adaptado con éxito.")

        await notify_update(self.rabbitmq, request_hash, 1, "CONFIG: Fichero NetCDF adaptado con éxito.")

        # Create the configuration file
        configuration_data = {
            "file": file_name,
            "requestHash": request_hash,
            "variableName": args["variableName"],
            "pressureLevel": args["pressureLevels"],
            "years": args["years"],
            "months": args["months"],
            "days": args["days"],
            "hours": args["hours"],
            "areaCovered": args["areaCovered"],
            "mapTypes": args["mapTypes"],
            "mapLevels": args["mapLevels"],
            "fileFormat": args["fileFormat"],
            "noData": args["noData"],
            "noMaps": args["noMaps"],
            "omp": args["omp"],
            "mpi": args["mpi"],
            "nThreads": args["nThreads"],
            "nProces": args["nProces"],
        }

        print("\n✅ Configuración lista.\n")

        message = create_message(STATUS_OK, "", configuration_data)
        await self.rabbitmq.publish(
            REQUESTS_EXCHANGE,
            HANDLER_START_KEY,
            message
        )

        print("\n✅ Archivo de configuración enviado a la cola de RabbitMQ.\n")


if __name__ == "__main__":
    async def main():
        # Initialize the RabbitMQ connection
        rabbitmq_client = RabbitMQ()
        await rabbitmq_client.initialize()

        # Initialize the configurator with the RabbitMQ client
        configurator = Configurator(rabbitmq_client)

        # Start consuming messages
        await rabbitmq_client.consume(CONFIG_QUEUE, callback=configurator.process_message)

        # Keep the application running
        try:
            # Run forever
            await asyncio.Future()
        except KeyboardInterrupt:
            print("Shutting down...")
        finally:
            # Close the connection when done
            await rabbitmq_client.close()

    # Run the async main function
    asyncio.run(main())
