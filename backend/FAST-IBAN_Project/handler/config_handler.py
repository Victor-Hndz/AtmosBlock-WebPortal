import sys
from typing import List
import asyncio

sys.path.append('/app/')

from utils.rabbitMQ.rabbitmq import RabbitMQ
from utils.rabbitMQ.process_body import process_body
from utils.rabbitMQ.create_message import create_message
from utils.rabbitMQ.rabbit_consts import HANDLER_QUEUE, NOTIFICATIONS_QUEUE, EXECUTION_EXCHANGE, EXECUTION_ALGORITHM_KEY, EXECUTION_VISUALIZATION_KEY, NOTIFY_EXECUTION, NOTIFY_VISUALIZATION
from utils.minio.upload_files import upload_files_to_request_hash
from utils.clean_folder_files import clean_directory
from utils.rabbitMQ.notify_results import notify_result
from utils.consts.consts import EXEC_FILE, STATUS_OK, STATUS_ERROR

OUT_DIR = "./out"


class ConfigHandler:
    """
    Main orchestrator for the FAST-IBAN processing pipeline.
    
    This class handles configuration loading, executes the processing steps
    in sequence, and manages communication between different components.
    """
    
    def __init__(self, rabbitmq_client: RabbitMQ):
        """
        Initialize the configuration handler with default values.
        
        Args:
            rabbitmq_client: RabbitMQ client instance for messaging
        """
        # Store the RabbitMQ client
        self.rabbitmq = rabbitmq_client
        
        # Configuration properties
        self.file_name = None
        self.request_hash = None
        self.variable_name = None
        self.pressure_level = None
        self.years = None
        self.months = None
        self.days = None
        self.hours = None
        self.area_covered = None
        self.map_types = None
        self.map_levels = None
        self.file_format = None
        self.no_data = None
        self.no_maps = None
        self.omp = None
        self.mpi = None
        self.n_threads = None
        self.n_processes = None
        
        # Processing state
        self.execution_completed = False
        self.maps_generated = False


    def init(self, data) -> None:
        """
        Initialize variables from a configuration file.
        
        Args:
            data: Configuration data in JSON format
        """
            
        # Extract configuration values
        self.file_name = data["file"]
        self.request_hash = data["requestHash"]
        self.variable_name = data["variableName"]
        self.pressure_level = data["pressureLevel"]
        self.years = data["years"]
        self.months = data["months"]
        self.days = data["days"]
        self.hours = data["hours"]
        self.area_covered = data["areaCovered"]
        self.map_types = data["mapTypes"]
        self.map_levels = data["mapLevels"]
        self.file_format = data["fileFormat"]
        self.no_data = data["noData"]
        self.no_maps = data["noMaps"]
        self.omp = data["omp"]
        self.mpi = data["mpi"]
        self.n_threads = data["nThreads"]
        self.n_processes = data["nProces"]

    async def handle_config_message(self, body: bytes) -> None:
        """
        Process a configuration message and begin the orchestration flow.
        
        Args:
            body: Raw message body from RabbitMQ
        """
        data = process_body(body)
        print(f"\n✅ Mensaje recibido en handler: {data}")
        print("\n✅ Archivo válido recibido. Iniciando procesamiento...")
        
        # Start the orchestration flow
        self.init(data)
        print(f"Archivo a procesar: {self.file_name}")
        await self.process_file()

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
    
    async def handle_execution_message(self, body: bytes) -> None:
        """
        Handle execution completion messages and proceed to the next step.
        
        Args:
            body: Raw message body from RabbitMQ
        """
        message = process_body(body)
        
        if message["exec_status"] == STATUS_ERROR:
            print("\n❌ Error al ejecutar el programa.")
            print(f"\t❌ Error: {message['exec_message']}")
            return
        elif message["exec_status"] == STATUS_OK:
            # print(f"\n[ ] Se recibió un mensaje de ejecución: {message['exec_message']}")
            print("\n✅ Ejecución completada exitosamente.")
            self.execution_completed = True
        
        # Continue with the next steps in the pipeline
        if not self.no_maps:
            await self.process_map_generation()
        else:
            print("\n✅ Procesamiento completado.")
            await notify_result(self.rabbitmq, "Processing completed successfully.", self.request_hash)
            clean_directory(OUT_DIR+"/"+self.request_hash)

    async def handle_map_generation_message(self, body: bytes) -> None:
        """
        Handle map generation completion messages and proceed to the next step.
        
        Args:
            body: Raw message body from RabbitMQ
        """
        message = process_body(body)
        print("\n[ ] Se recibió un mensaje de generación de mapas.")
        
        if message["exec_status"] == STATUS_ERROR:
            print("\n❌ Error al generar los mapas.")
            print(f"\t❌ Error: {message['exec_message']}")
            return
        
        print("\n✅ Generación de mapas completada exitosamente.")
        self.maps_generated = True
        
        print("\n✅ Procesamiento completado.")
        await notify_result(self.rabbitmq, "Processing completed successfully.", self.request_hash)
        clean_directory(OUT_DIR+"/"+self.request_hash)

    async def process_file(self) -> None:
        """
        Process the configuration file and execute the algorithm.
        """
        lat_range = [int(self.area_covered[2]), int(self.area_covered[0])]
        lon_range = [int(self.area_covered[1]), int(self.area_covered[3])]
        
        print(f"\n[ ] Ejecutando el programa para el archivo: {self.file_name}")

        cmd = self.prepare_execution_command(lat_range, lon_range)
        
        print("\n[ ] Enviando mensaje a la cola de ejecución...")
        
        data = {"cmd": cmd, "request_hash": self.request_hash, "variable_name": self.variable_name.lower()}
        
        # Send execution request and wait for response
        message = create_message(STATUS_OK, "", data)
        await self.rabbitmq.publish(EXECUTION_EXCHANGE, EXECUTION_ALGORITHM_KEY, message)
        await self.rabbitmq.consume(NOTIFICATIONS_QUEUE, callback=self.handle_general_notification_message)

    def prepare_execution_command(self, lat_range: List[int], lon_range: List[int]) -> List[str]:
        """
        Prepare the execution command based on configuration.
        
        Args:
            lat_range: Latitude range [min, max]
            lon_range: Longitude range [min, max]
            
        Returns:
            List of command arguments
        """
        if self.omp and not self.mpi:
            return [EXEC_FILE, self.file_name, str(lat_range[0]), str(lat_range[1]), 
                    str(lon_range[0]), str(lon_range[1]), OUT_DIR+"/"+self.request_hash+"/", self.n_threads]
        elif self.mpi and not self.omp:
            return ["mpirun", "-n", self.n_processes, EXEC_FILE, self.file_name, 
                    str(lat_range[0]), str(lat_range[1]), str(lon_range[0]), str(lon_range[1]), OUT_DIR+"/"+self.request_hash+"/", "1"]
        elif self.omp and self.mpi:
            return ["mpirun", "-n", self.n_processes, EXEC_FILE, self.file_name, 
                    str(lat_range[0]), str(lat_range[1]), str(lon_range[0]), str(lon_range[1]), OUT_DIR+"/"+self.request_hash+"/", self.n_threads]
        else:
            return [EXEC_FILE, self.file_name, str(lat_range[0]), str(lat_range[1]), 
                    str(lon_range[0]), str(lon_range[1]), OUT_DIR+"/"+self.request_hash+"/", "1"]
        
    async def process_map_generation(self) -> None:
        """
        Generate maps based on the configuration.
        """
        
        data = {
            "file_name": self.file_name,
            "request_hash": self.request_hash,
            "variable_name": self.variable_name,
            "pressure_level": self.pressure_level,
            "years": self.years,
            "months": self.months,
            "days": self.days,
            "hours": self.hours,
            "map_types": self.map_types,
            "map_levels": self.map_levels,
            "file_format": self.file_format,
            "area_covered": self.area_covered,
        }
       
        # Send execution request and wait for response
        print("\n[ ] Enviando mensaje a la cola de generación de mapas...")
        message = create_message(STATUS_OK, "", data)
        await self.rabbitmq.publish(EXECUTION_EXCHANGE, EXECUTION_VISUALIZATION_KEY, message)
        await self.rabbitmq.consume(NOTIFICATIONS_QUEUE, callback=self.handle_general_notification_message)
    
# Update the main entry point to use asyncio
if __name__ == "__main__":
    async def main():
        # Initialize the RabbitMQ connection
        rabbitmq_client = RabbitMQ()
        await rabbitmq_client.initialize()
        
        # Initialize the handler with the RabbitMQ client
        handler = ConfigHandler(rabbitmq_client)
        
        # Start consuming messages
        await rabbitmq_client.consume(HANDLER_QUEUE, callback=handler.handle_config_message)
        
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
