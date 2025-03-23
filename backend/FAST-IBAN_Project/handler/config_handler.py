import yaml
import sys
import json
from typing import List

sys.path.append('/app/')

from visualization.generate_maps import generate_maps as gm
from utils.enums.DataType import DataType

from utils.rabbitMQ.send_message import send_message
from utils.rabbitMQ.receive_messages import receive_messages
from utils.rabbitMQ.process_body import process_body
from utils.rabbitMQ.create_message import create_message
from utils.consts.consts import EXEC_FILE, STATUS_OK, STATUS_ERROR, MESSAGE_NO_COMPILE, MESSAGE_DEBUG


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
        self.map_types = None
        self.map_ranges = None
        self.area_covered = None
        self.map_levels = None
        self.file_format = None
        self.tracking = None
        self.debug = None
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

    def init(self, yaml_file: str) -> None:
        """
        Initialize variables from a YAML configuration file.
        
        Args:
            yaml_file: Path to the YAML configuration file
        """
        # Read the configuration file
        with open(yaml_file, 'r') as yamlfile:
            config = yaml.load(yamlfile, Loader=yaml.FullLoader)
        print("\n✅ Archivo de configuración .yaml leído exitosamente.\n")
            
        # Extract configuration values
        map_config = config["MAP"]
        self.file_name = map_config["file"]
        self.map_types = map_config["mapTypes"]
        self.map_ranges = map_config["mapRanges"]
        self.area_covered = map_config["areaCovered"]
        self.map_levels = map_config["mapLevels"]
        self.file_format = map_config["fileFormat"]
        self.tracking = map_config["tracking"]
        self.debug = map_config["debug"]
        self.no_compile = map_config["noCompile"]
        self.no_execute = map_config["noExecute"]
        self.no_maps = map_config["noMaps"]
        self.animation = map_config["animation"]
        self.omp = map_config["omp"]
        self.mpi = map_config["mpi"]
        self.n_threads = map_config["nThreads"]
        self.n_processes = map_config["nProces"]

    def handle_config_message(self, body: bytes) -> None:
        """
        Process a configuration message and begin the orchestration flow.
        
        Args:
            body: Raw message body from RabbitMQ
        """
        data = process_body(body)
        yaml_file = json.loads(data)
        print(f"\n✅ Mensaje recibido en handler: {yaml_file}")
        
        if not yaml_file.endswith(".yaml"):
            print("\n❌ Mensaje inválido. Se esperaba un archivo .yaml existente.")
            return 

        print("\n✅ Archivo válido recibido. Iniciando procesamiento...")
        
        # Start the orchestration flow
        self.init(yaml_file)
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
        data = process_body(body)
        message = json.loads(data)
        
        if message["exec_status"] == STATUS_ERROR:
            print("\n❌ Error al ejecutar el programa.")
            print(f"\t❌ Error: {message['exec_message']}")
            return
        elif message["exec_status"] == STATUS_OK:
            print(f"\n[ ] Se recibió un mensaje de ejecución: {message['exec_message']}")
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
        data = process_body(body)
        message = json.loads(data)
        
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

        # Prepare execution command based on configuration
        cmd = self._prepare_execution_command(lat_range, lon_range)
        debug_cmd = self._prepare_debug_command(lat_range, lon_range)
        
        print("\n[ ] Enviando mensaje a la cola de ejecución...")
        
        # Prepare data based on configuration
        if self.no_compile:
            data = {"request_type": MESSAGE_NO_COMPILE, "cmd": cmd}
        elif self.debug:
            data = {"request_type": MESSAGE_DEBUG, "cmd": debug_cmd}
        else:
            data = {"request_type": "", "cmd": cmd}
        
        # Send execution request and wait for response
        send_message(create_message(STATUS_OK, "", data), "execution", "execution.algorithm")
        receive_messages("notifications_queue", "notify.handler", callback=self.handle_execution_message)

    def _prepare_execution_command(self, lat_range: List[int], lon_range: List[int]) -> List[str]:
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
                    str(lon_range[0]), str(lon_range[1]), self.n_threads]
        elif self.mpi and not self.omp:
            return ["mpirun", "-n", self.n_processes, EXEC_FILE, self.file_name, 
                    str(lat_range[0]), str(lat_range[1]), str(lon_range[0]), str(lon_range[1]), "1"]
        elif self.omp and self.mpi:
            return ["mpirun", "-n", self.n_processes, EXEC_FILE, self.file_name, 
                    str(lat_range[0]), str(lat_range[1]), str(lon_range[0]), str(lon_range[1]), self.n_threads]
        else:
            return [EXEC_FILE, self.file_name, str(lat_range[0]), str(lat_range[1]), 
                    str(lon_range[0]), str(lon_range[1]), "1"]

    def _prepare_debug_command(self, lat_range: List[int], lon_range: List[int]) -> List[str]:
        """
        Prepare the debug command based on configuration.
        
        Args:
            lat_range: Latitude range [min, max]
            lon_range: Longitude range [min, max]
            
        Returns:
            List of debug command arguments
        """
        if self.omp and not self.mpi:
            return ["gdb", "--args", EXEC_FILE, self.file_name, str(lat_range[0]), str(lat_range[1]), 
                    str(lon_range[0]), str(lon_range[1]), self.n_threads]
        elif self.mpi and not self.omp:
            return ["gdb", "--args", "mpirun", "-n", self.n_processes, EXEC_FILE, self.file_name, 
                    str(lat_range[0]), str(lat_range[1]), str(lon_range[0]), str(lon_range[1]), "1"]
        elif self.omp and self.mpi:
            return ["gdb", "--args", "mpirun", "-n", self.n_processes, EXEC_FILE, self.file_name, 
                    str(lat_range[0]), str(lat_range[1]), str(lon_range[0]), str(lon_range[1]), self.n_threads]
        else:
            return ["gdb", "--args", EXEC_FILE, self.file_name, str(lat_range[0]), str(lat_range[1]), 
                    str(lon_range[0]), str(lon_range[1]), "1"]
            
    def process_map_generation(self) -> None:
        """
        Generate maps based on the configuration.
        """
        print("\n[ ] Iniciando generación de mapas...")
        
        # GENERATE MAPS
        # Iterate over map types, ranges, and levels to generate maps
        for map_type in self.map_types:
            for map_range in self.map_ranges:
                for map_level in self.map_levels:
                    if map_type == DataType.TYPE1:
                        gm.generate_contour_map()
                    elif map_type == DataType.TYPE2:
                        gm.generate_scatter_map()
                    elif map_type == DataType.TYPE3:
                        gm.generate_combined_map()
                    elif map_type == DataType.TYPE4:
                        gm.generate_formations_map()
        
                    
        
        self.maps_generated = True
        
        # Continue with next steps
        if self.animation:
            self.process_map_animation()
        elif self.tracking:
            self.process_formation_tracking()
        else:
            print("\n✅ Procesamiento completado.")
    
    def process_map_animation(self) -> None:
        """
        Generate animation based on maps.
        """
        if not self.animation:
            return
            
        print("\n[ ] Iniciando generación de animación...")
        
        # This would be implemented to send a message to the animation service
        # send_message(create_message(STATUS_OK, "", data), "animation", "animation.generate")
        # receive_messages("animation_notifications", "notify.animation", callback=self.handle_animation_message)
        
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
        # receive_messages("tracking_notifications", "notify.tracking", callback=self.handle_tracking_message)
        
        # Temporary placeholder for the implementation
        print("\n[ ] Simulando finalización de seguimiento de formaciones...")
        print("\n✅ Procesamiento completado.")


if __name__ == "__main__":
    handler = ConfigHandler()
    receive_messages("config_queue", "handler.start", callback=handler.handle_config_message)
