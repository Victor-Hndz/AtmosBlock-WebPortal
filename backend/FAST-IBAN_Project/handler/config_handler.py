import os
import sys
from typing import List, Optional
import asyncio

sys.path.append('/app/')

from utils.rabbitMQ.rabbitmq import RabbitMQ
from utils.rabbitMQ.process_body import process_body
from utils.rabbitMQ.create_message import create_message
from utils.rabbitMQ.rabbit_consts import HANDLER_QUEUE, NOTIFICATIONS_QUEUE, EXECUTION_EXCHANGE, EXECUTION_ALGORITHM_KEY, EXECUTION_VISUALIZATION_KEY, NOTIFY_EXECUTION, NOTIFY_VISUALIZATION
from utils.clean_folder_files import clean_directory
from utils.rabbitMQ.notify_results import notify_result
from utils.consts.consts import EXEC_FILE, STATUS_OK, STATUS_ERROR

OUT_DIR = "./out"


class ConfigHandler:
    """
    Main orchestrator for the FAST-IBAN processing pipeline.

    Keeps the configuration of every request in progress by its hash. Execution and visualization
    notifications carry that hash, so concurrent requests do not overwrite each other (WEB-222).
    """

    def __init__(self, rabbitmq_client: RabbitMQ):
        """
        Initialize the configuration handler.

        Args:
            rabbitmq_client: RabbitMQ client instance for messaging
        """
        self.rabbitmq = rabbitmq_client
        # Configuration of the requests in progress, by request hash
        self.requests = {}

    async def handle_config_message(self, body: bytes) -> None:
        """
        Process a configuration message and begin the orchestration flow.

        Args:
            body: Raw message body from RabbitMQ
        """
        config = process_body(body)
        print(f"\n✅ Mensaje recibido en handler: {config}")
        print("\n✅ Archivo válido recibido. Iniciando procesamiento...")

        self.requests[config["requestHash"]] = config
        print(f"Archivo a procesar: {config['file']}")
        await self.process_file(config)

    async def handle_general_notification_message(self, body: bytes) -> None:
        """
        Handle general notification messages.

        Args:
            body: Raw message body from RabbitMQ
        """
        data = process_body(body)
        print(f"\n[ ] Mensaje de notificación recibido: {data}")

        # Process the message based on its type
        if data["request_type"] == NOTIFY_EXECUTION:
            await self.handle_execution_message(body)
        elif data["request_type"] == NOTIFY_VISUALIZATION:
            await self.handle_map_generation_message(body)

    def request_of(self, message: dict) -> Optional[dict]:
        """Configuration of the request a notification belongs to, or None if it is unknown."""
        config = self.requests.get(message.get("request_hash"))
        if config is None:
            print(f"\n⚠️ Notificación de una petición desconocida: {message.get('request_hash')}")
        return config

    async def handle_execution_message(self, body: bytes) -> None:
        """
        Handle execution completion messages and proceed to the next step.

        Args:
            body: Raw message body from RabbitMQ
        """
        message = process_body(body)
        config = self.request_of(message)
        if config is None:
            return
        request_hash = config["requestHash"]

        if message["exec_status"] == STATUS_ERROR:
            print("\n❌ Error al ejecutar el programa.")
            print(f"\t❌ Error: {message['exec_message']}")
            self.requests.pop(request_hash, None)
            # WEB-211: la API marca la petición como fallida en vez de dejarla en GENERATING.
            await notify_result(self.rabbitmq, f"Error al ejecutar el algoritmo: {message['exec_message']}", request_hash, STATUS_ERROR)
            return

        print("\n✅ Ejecución completada exitosamente.")

        # Continue with the next steps in the pipeline
        if not config["noMaps"]:
            await self.process_map_generation(config)
        else:
            await self.finish(request_hash)

    async def handle_map_generation_message(self, body: bytes) -> None:
        """
        Handle map generation completion messages and proceed to the next step.

        Args:
            body: Raw message body from RabbitMQ
        """
        message = process_body(body)
        print("\n[ ] Se recibió un mensaje de generación de mapas.")
        config = self.request_of(message)
        if config is None:
            return
        request_hash = config["requestHash"]

        if message["exec_status"] == STATUS_ERROR:
            print("\n❌ Error al generar los mapas.")
            print(f"\t❌ Error: {message['exec_message']}")
            self.requests.pop(request_hash, None)
            await notify_result(self.rabbitmq, f"Error al generar los mapas: {message['exec_message']}", request_hash, STATUS_ERROR)
            return

        print("\n✅ Generación de mapas completada exitosamente.")
        await self.finish(request_hash)

    async def finish(self, request_hash: str) -> None:
        """Notify the successful result and remove the local output of the request."""
        self.requests.pop(request_hash, None)
        print("\n✅ Procesamiento completado.")
        await notify_result(self.rabbitmq, "Processing completed successfully.", request_hash)
        clean_directory(OUT_DIR+"/"+request_hash)

    async def process_file(self, config: dict) -> None:
        """
        Send the execution of the algorithm for a request.
        """
        area_covered = config["areaCovered"]
        lat_range = [int(area_covered[2]), int(area_covered[0])]
        lon_range = [int(area_covered[1]), int(area_covered[3])]

        print(f"\n[ ] Ejecutando el programa para el archivo: {config['file']}")

        cmd = self.prepare_execution_command(config, lat_range, lon_range)

        print("\n[ ] Enviando mensaje a la cola de ejecución...")

        data = {"cmd": cmd, "request_hash": config["requestHash"], "variable_name": config["variableName"].lower()}

        # The result arrives on NOTIFICATIONS_QUEUE, consumed once at startup
        message = create_message(STATUS_OK, "", data)
        await self.rabbitmq.publish(EXECUTION_EXCHANGE, EXECUTION_ALGORITHM_KEY, message)

    def prepare_execution_command(self, config: dict, lat_range: List[int], lon_range: List[int]) -> List[str]:
        """
        Prepare the execution command based on configuration.

        Args:
            config: Configuration of the request
            lat_range: Latitude range [min, max]
            lon_range: Longitude range [min, max]

        Returns:
            List of command arguments
        """
        out_dir = OUT_DIR+"/"+config["requestHash"]+"/"
        area = [config["file"], str(lat_range[0]), str(lat_range[1]), str(lon_range[0]), str(lon_range[1]), out_dir]

        # WEB-218: each mode has its own binary (./FAST-IBAN, _omp, _mpi, _omp_mpi). Only the geopotential core
        # (code/) builds the parallel variants; the temperature core (code_t/) is serial only.
        parallel = config["variableName"].lower() == "geopotential"
        omp = bool(config["omp"]) and parallel
        mpi = bool(config["mpi"]) and parallel

        # ponytail: defaults from this container's CPU count (the execution container runs on the same host);
        # the form has no thread/process fields yet.
        cpus = os.cpu_count() or 1
        if omp and mpi:
            processes = config["nProces"] or 2
            threads = config["nThreads"] or max(1, cpus // processes)
        else:
            processes = config["nProces"] or cpus
            threads = config["nThreads"] or cpus

        binary = EXEC_FILE + ("_omp" if omp else "") + ("_mpi" if mpi else "")
        cmd = [binary, *area, str(threads) if omp else "1"]
        return ["mpirun", "-n", str(processes), *cmd] if mpi else cmd

    async def process_map_generation(self, config: dict) -> None:
        """
        Send the map generation of a request.
        """

        data = {
            "file_name": config["file"],
            "request_hash": config["requestHash"],
            "variable_name": config["variableName"],
            "pressure_level": config["pressureLevel"],
            "years": config["years"],
            "months": config["months"],
            "days": config["days"],
            "hours": config["hours"],
            "map_types": config["mapTypes"],
            "map_levels": config["mapLevels"],
            "file_format": config["fileFormat"],
            "area_covered": config["areaCovered"],
        }

        # The result arrives on NOTIFICATIONS_QUEUE, consumed once at startup
        print("\n[ ] Enviando mensaje a la cola de generación de mapas...")
        message = create_message(STATUS_OK, "", data)
        await self.rabbitmq.publish(EXECUTION_EXCHANGE, EXECUTION_VISUALIZATION_KEY, message)

# Update the main entry point to use asyncio
if __name__ == "__main__":
    async def main():
        # Initialize the RabbitMQ connection
        rabbitmq_client = RabbitMQ()
        await rabbitmq_client.initialize()

        # Initialize the handler with the RabbitMQ client
        handler = ConfigHandler(rabbitmq_client)

        # Start consuming messages: new requests and the notifications of every step (WEB-222: once)
        await rabbitmq_client.consume(HANDLER_QUEUE, callback=handler.handle_config_message)
        await rabbitmq_client.consume(NOTIFICATIONS_QUEUE, callback=handler.handle_general_notification_message)

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
