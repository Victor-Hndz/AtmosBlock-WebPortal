import sys
import json
from typing import List

sys.path.append('/app/')

from utils.rabbitMQ.rabbitmq import RabbitMQ
from utils.rabbitMQ.process_body import process_body
from utils.rabbitMQ.create_message import create_message
from utils.rabbitMQ.rabbit_consts import HANDLER_QUEUE, NOTIFICATIONS_QUEUE, EXECUTION_EXCHANGE, EXECUTION_ALGORITHM_KEY, EXECUTION_VISUALIZATION_KEY, EXECUTION_ANIMATION_KEY, EXECUTION_TRACKING_KEY
from utils.minio.upload_files import upload_files_to_request_hash
from utils.clean_folder_files import clean_directory
from utils.consts.consts import EXEC_FILE, STATUS_OK, STATUS_ERROR, MESSAGE_NO_COMPILE

OUT_DIR = "./out"


class ConfigHandler:
    """
    Main orchestrator for the FAST-IBAN processing pipeline.
    
    This class handles configuration loading, executes the processing steps
    in sequence, and manages communication between different components.
    """
    
    def __init__(self):
        """Initialize the configuration handler with default values."""
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
        self.map_ranges = None
        self.map_levels = None
        self.file_format = None
        self.tracking = None
        self.no_compile = None
        self.no_execute = None
        self.no_maps = None
        self.animation = None
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
        self.map_ranges = data["mapRanges"]
        self.map_levels = data["mapLevels"]
        self.file_format = data["fileFormat"]
        self.tracking = data["tracking"]
        self.no_compile = data["noCompile"]
        self.no_execute = data["noExecute"]
        self.no_maps = data["noMaps"]
        self.animation = data["animation"]
        self.omp = data["omp"]
        self.mpi = data["mpi"]
        self.n_threads = data["nThreads"]
        self.n_processes = data["nProces"]

    def handle_config_message(self, body: bytes) -> None:
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
        self.execute_processing_pipeline()

    def execute_processing_pipeline(self) -> None:
        """
        Main orchestration method that executes the processing steps in sequence.
        """
        # Step 1: Process the input file and execute the algorithm
        if not self.no_execute:
            self.process_file()
            # The execution callback will trigger the next steps
        else:
            print("\n⏩ Ejecución omitida por configuración.")
            self.execution_completed = True
            
            # Continue with next steps if execution is skipped
            if not self.no_maps:
                self.process_map_generation()
            elif self.animation:
                self.process_map_animation()
            elif self.tracking:
                self.process_formation_tracking()
            else:
                print("\n✅ Procesamiento completado.")

    def handle_execution_message(self, body: bytes) -> None:
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
            self.process_map_generation()
        elif self.animation:
            self.process_map_animation()
        elif self.tracking:
            self.process_formation_tracking()
        else:
            print("\n✅ Procesamiento completado.")

    def handle_map_generation_message(self, body: bytes) -> None:
        """
        Handle map generation completion messages and proceed to the next step.
        
        Args:
            body: Raw message body from RabbitMQ
        """
        message = process_body(body)
        
        if message["exec_status"] == STATUS_ERROR:
            print("\n❌ Error al generar los mapas.")
            print(f"\t❌ Error: {message['exec_message']}")
            return
        
        print("\n✅ Generación de mapas completada exitosamente.")
        self.maps_generated = True
        
        # Continue with the next steps in the pipeline
        if self.animation:
            self.process_map_animation()
        elif self.tracking:
            self.process_formation_tracking()
        else:
            print("\n✅ Procesamiento completado.")

    def handle_animation_message(self, body: bytes) -> None:
        """
        Handle animation completion messages and proceed to the next step.
        
        Args:
            body: Raw message body from RabbitMQ
        """
        data = process_body(body)
        message = json.loads(data)
        
        if message["exec_status"] == STATUS_ERROR:
            print("\n❌ Error al generar la animación.")
            print(f"\t❌ Error: {message['exec_message']}")
            return
        
        print("\n✅ Generación de animación completada exitosamente.")
        
        # Continue with the next step if needed
        if self.tracking:
            self.process_formation_tracking()
        else:
            print("\n✅ Procesamiento completado.")
    
    def handle_tracking_message(self, body: bytes) -> None:
        """
        Handle tracking completion messages.
        
        Args:
            body: Raw message body from RabbitMQ
        """
        data = process_body(body)
        message = json.loads(data)
        
        if message["exec_status"] == STATUS_ERROR:
            print("\n❌ Error al procesar el seguimiento de formaciones.")
            print(f"\t❌ Error: {message['exec_message']}")
            return
        
        print("\n✅ Seguimiento de formaciones completado exitosamente.")
        print("\n✅ Procesamiento completado.")

    def process_file(self) -> None:
        """
        Process the configuration file and execute the algorithm.
        """
        lat_range = [int(self.area_covered[2]), int(self.area_covered[0])]
        lon_range = [int(self.area_covered[1]), int(self.area_covered[3])]
        
        print(f"\n[ ] Ejecutando el programa para el archivo: {self.file_name}")

        cmd = self.prepare_execution_command(lat_range, lon_range)
        
        print("\n[ ] Enviando mensaje a la cola de ejecución...")
        
        if self.no_compile:
            data = {"request_type": MESSAGE_NO_COMPILE, "cmd": cmd, "request_hash": self.request_hash}
        else:
            data = {"request_type": "", "cmd": cmd, "request_hash": self.request_hash}
        
        # Send execution request and wait for response
        message = create_message("execution.algorithm", STATUS_OK, "", data)
        rabbitmq.publish(EXECUTION_EXCHANGE, EXECUTION_ALGORITHM_KEY, message)
        rabbitmq.consume(NOTIFICATIONS_QUEUE, callback=self.handle_execution_message)

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
        
    def process_map_generation(self) -> None:
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
            "map_ranges": self.map_ranges,
            "map_levels": self.map_levels,
            "file_format": self.file_format,
            "area_covered": self.area_covered,
        }
       
        # Send execution request and wait for response
        print("\n[ ] Enviando mensaje a la cola de generación de mapas...")
        message = create_message("execution.visualization", STATUS_OK, "", data)
        rabbitmq.publish(EXECUTION_EXCHANGE, EXECUTION_VISUALIZATION_KEY, message)
        rabbitmq.consume(NOTIFICATIONS_QUEUE, callback=self.handle_map_generation_message)
    
    def process_map_animation(self) -> None:
        """
        Generate animation based on maps.
        """
        if not self.animation:
            return
            
        print("\n[ ] Iniciando generación de animación...")
        
        # This would be implemented to send a message to the animation service
        # send_message(create_message(STATUS_OK, "", data), "animation", "animation.generate")
        # receive_messages("animation_notifications", callback=self.handle_animation_message)
        
        # Temporary placeholder for the implementation
        print("\n[ ] Simulando finalización de generación de animación...")
        
        # Continue with next steps
        if self.tracking:
            self.process_formation_tracking()
        else:
            print("\n✅ Procesamiento completado.")
    
    def process_formation_tracking(self) -> None:
        """
        Track formations based on the configuration.
        """
        if not self.tracking:
            return
            
        print("\n[ ] Iniciando seguimiento de formaciones...")
        
        # This would be implemented to send a message to the tracking service
        # send_message(create_message(STATUS_OK, "", data), "tracking", "tracking.process")
        # receive_messages("tracking_notifications", callback=self.handle_tracking_message)
        
        # Temporary placeholder for the implementation
        print("\n[ ] Simulando finalización de seguimiento de formaciones...")
        print("\n✅ Procesamiento completado.")

    def send_finish_message(self) -> None:
        """
        Send a message indicating that the processing has finished.
        """
        # Save the files to MinIO and clean the directory
        upload_files_to_request_hash(self.request_hash, OUT_DIR)
        clean_directory(OUT_DIR)
        
        # message = {"exec_status": STATUS_OK, "exec_message": "Processing completed."}
        # send_message(create_message(STATUS_OK, "", message), "notifications", "notify.handler")

if __name__ == "__main__":
    rabbitmq = RabbitMQ()
    handler = ConfigHandler()
    rabbitmq.consume(HANDLER_QUEUE, callback=handler.handle_config_message)
