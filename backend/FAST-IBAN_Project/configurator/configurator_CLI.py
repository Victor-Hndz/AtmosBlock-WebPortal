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
from utils.consts.consts import ARGUMENTS, STATUS_OK, STATUS_ERROR
from rutas import area_de_descarga, format_list, format_range, mount_file_name  # noqa: F401  (ALG-369, WEB-359)


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
