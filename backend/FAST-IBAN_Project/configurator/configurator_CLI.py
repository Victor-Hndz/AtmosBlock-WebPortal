import os
import sys
import asyncio

sys.path.append("/app/")

from utils.api_request import request_data
from utils.netcdf_editor import adapt_netcdf
from utils.rabbitMQ.rabbitmq import RabbitMQ
from utils.rabbitMQ.process_body import process_body
from utils.rabbitMQ.create_message import create_message
from utils.rabbitMQ.rabbit_consts import CONFIG_QUEUE, REQUESTS_EXCHANGE, HANDLER_START_KEY, PROGRESS_EXCHANGE, PROGRESS_UPDATE_KEY
from utils.consts.consts import API_FOLDER, ARGUMENTS, STATUS_OK


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


class Configurator:
    """
    Class for handling the configuration of the application.

    This class is responsible for processing messages from RabbitMQ, validating arguments,
    and generating the configuration file for the handler.
    """

    def __init__(self, rabbitmq_client: RabbitMQ):
        self.args = None
        self.file_name = None
        self.rabbitmq = rabbitmq_client

    async def process_message(self, body: bytes) -> None:
        """
        Process a configuration message and begin the orchestration flow.

        Args:
            body: Raw message body from RabbitMQ
        """

        config = process_body(body)
        self.args = {key: config.get(key, None) for key in ARGUMENTS}

        print("\n✅ Argumentos cargados y validados con éxito.\n")
        print(f"Argumentos: {self.args}")
        
        progress = {"increment": 1, "message": "CONFIG: argumentos recibidos con éxito."}
        message = create_message(STATUS_OK, "", progress)
        print(f"Mensaje: {message}")
        await self.rabbitmq.publish(
            PROGRESS_EXCHANGE,
            PROGRESS_UPDATE_KEY,
            message
        )

        self.mount_file_name()

        if not os.path.exists(self.file_name):
            # call to API for dowload the file
            print(f"El archivo {self.file_name} no existe, se procederá a descargarlo.")
            request_data(
                self.args["variableName"],
                self.args["years"],
                self.args["months"],
                self.args["days"],
                self.args["hours"],
                self.args["pressureLevels"],
                self.args["areaCovered"],
                self.file_name,
            )
            print(f"\n✅ Archivo {self.file_name} descargado con éxito.")
            
        progress = {"increment": 1, "message": "CONFIG: descarga del archivo NetCDF realizada con éxito."}
        message = create_message(STATUS_OK, "", progress)
        await self.rabbitmq.publish(
            PROGRESS_EXCHANGE,
            PROGRESS_UPDATE_KEY,
            message
        )


        adapt_netcdf(self.file_name)
        print(f"\n✅ Archivo {self.file_name} adaptado con éxito.")
        
        progress = {"increment": 1, "message": "CONFIG: Fichero NetCDF adaptado con éxito."}
        message = create_message(STATUS_OK, "", progress)
        await self.rabbitmq.publish(
            PROGRESS_EXCHANGE,
            PROGRESS_UPDATE_KEY,
            message
        )

        # Create the configuration file
        configuration_data = {
            "file": self.file_name,
            "requestHash": self.args["requestHash"],
            "variableName": self.args["variableName"],
            "pressureLevel": self.args["pressureLevels"],
            "years": self.args["years"],
            "months": self.args["months"],
            "days": self.args["days"],
            "hours": self.args["hours"],
            "areaCovered": self.args["areaCovered"],
            "mapTypes": self.args["mapTypes"],
            "mapRanges": self.args["mapRanges"],
            "mapLevels": self.args["mapLevels"],
            "fileFormat": self.args["fileFormat"],
            "tracking": self.args["tracking"],
            "noCompile": self.args["noCompile"],
            "noExecute": self.args["noExecute"],
            "noMaps": self.args["noMaps"],
            "animation": self.args["animation"],
            "omp": self.args["omp"],
            "mpi": self.args["mpi"],
            "nThreads": self.args["nThreads"],
            "nProces": self.args["nProces"],
        }

        print("\n✅ Configuración lista.\n")

        message = create_message(STATUS_OK, "", configuration_data)
        await self.rabbitmq.publish(
            REQUESTS_EXCHANGE,
            HANDLER_START_KEY,
            message
        )

        print("\n✅ Archivo de configuración enviado a la cola de RabbitMQ.\n")

    def mount_file_name(self):
        """Generate the name of the file based on the parameters provided."""

        # Asign default values
        variable = self.args["variableName"] or ""
        pressure_levels = self.args["pressureLevels"] or []
        years = format_list(self.args["years"] or [])
        months = format_list(self.args["months"] or [])
        days = format_list(self.args["days"] or [])
        hours = format_list(self.args["hours"] or [])

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

        self.file_name = f"{API_FOLDER}/{variable}_{pressure_part}_{year_part}-{month_part}-{day_part}_{hour_part}.nc"


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
