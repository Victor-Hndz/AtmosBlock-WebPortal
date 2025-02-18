import os
import yaml
import sys
import json

sys.path.append('/app/')

from utils.api_request import request_data
from utils.netcdf_editor import adapt_netcdf
from utils.rabbitMQ.send_message import send_message
from utils.rabbitMQ.receive_messages import receive_messages
from utils.rabbitMQ.init_rabbit import init_rabbitmq

ARGS_FILE = "./configurator/exec_args.yaml"
API_FOLDER = "/app/config/data"

# Lista de argumentos permitidos
ARGUMENTS = [
    "variableName", "pressureLevels", "years", "months", "days", "hours",
    "areaCovered", "mapTypes", "mapRanges", "mapLevels", "fileFormat", "outDir", "tracking", "debug", "noCompile", "noExecute", "noMaps", "animation", "omp", "mpi",
    "nThreads", "nProces"
]

def load_args_from_file(file_path):
    """Carga los argumentos desde un archivo YAML."""
    try:
        with open(file_path, "r") as file:
            config = yaml.safe_load(file) or {}
    except FileNotFoundError:
        print(f"❌ Error: Archivo {file_path} no encontrado.")
        sys.exit(1)
    except yaml.YAMLError as e:
        print(f"❌ Error al leer el YAML: {e}")
        sys.exit(1)
    
    return {key: config.get(key, None) for key in ARGUMENTS}


def load_args_from_queue(body):
    """Carga los argumentos desde la cola de RabbitMQ."""
    try:
        decoded_body = json.loads(body.decode("utf-8"))
        config = json.loads(decoded_body['data'])
    except json.JSONDecodeError as e:
        print(f"❌ Error al decodificar JSON: {e}")
        sys.exit(1)
    
    print("\n✅ Argumentos cargados y validados con éxito.\n")
    return {key: config.get(key, None) for key in ARGUMENTS}


def mount_file_name(variable, pressure_levels, years, months, days, hours):
    """Genera el nombre del archivo basado en los parámetros proporcionados."""
    
    def format_range(values):
        """Convierte una lista de valores en un rango si son consecutivos o los lista."""
        if not values:
            return ""
    
        values = sorted(map(int, values))  # Convierte a enteros y ordena
        ranges = []
        start = values[0]
        
        for i in range(1, len(values)):
            if values[i] != values[i - 1] + 1:
                # Si hay una interrupción en la secuencia, almacena el rango
                ranges.append((start, values[i - 1]))
                start = values[i]
        
        ranges.append((start, values[-1]))  # Último rango
        
        return "-".join(f"{s:02d}" if s == e else f"{s:02d}-{e:02d}" for s, e in ranges)
    
    def format_list(values):
        """Convierte valores en una lista a strings con ceros a la izquierda."""
        return [f"{int(v):02d}" for v in values]
    
    # Asignar valores por defecto si alguno es None
    variable = variable or ""
    pressure_levels = pressure_levels or []
    years = format_list(years or [])
    months = format_list(months or [])
    days = format_list(days or [])
    hours = format_list(hours or [])

    # Construcción del nombre del archivo
    pressure_part = "-".join(pressure_levels) + "hPa" if len(pressure_levels) > 1 else pressure_levels[0] + "hPa"
    year_part = "-".join(years)
    month_part = "-".join(months)
    day_part = f"({format_range(days)})"
    hour_part = "-".join(hours) + "UTC"

    return f"{API_FOLDER}/{variable}_{pressure_part}_{year_part}-{month_part}-{day_part}_{hour_part}.nc"


def main():
    # args = load_args_from_file(ARGS_FILE)
    #inicilizar rabbitmq
    init_rabbitmq()
    receive_messages("config_queue", ["config.create"], process_message)
    

def process_message(body):
    args = load_args_from_queue(body)
    
    print("\n✅ Argumentos cargados y validados con éxito.\n")
    print(f"Argumentos: {args}")
    
    file = mount_file_name(args["variableName"], args["pressureLevels"], args["years"], args["months"], args["days"], args["hours"])
    
    #buscar si el archivo existe
    if not os.path.exists(file):
        #llamar a la API y bajarlo
        print(f"El archivo {file} no existe, se procederá a descargarlo.")
        request_data(args["variableName"], args["years"], args["months"], args["days"], args["hours"], args["pressureLevels"], args["areaCovered"], file)
        print(f"\n✅ Archivo {file} descargado con éxito.")
        
    adapt_netcdf(file)
    print(f"\n✅ Archivo {file} adaptado con éxito.")
        
    
    # Crear el diccionario de configuración para cada mapa
    configuration = {
        "file": file,
        "maps": args["mapTypes"],
        "es_max": args["mapRanges"],
        "area": args["areaCovered"],
        "levels": args["mapLevels"],
        "file_format": args["fileFormat"],
        "output": args["outDir"],
        "tracking": args["tracking"],
        "debug": args["debug"],
        "no_compile": args["noCompile"],
        "no_execute": args["noExecute"],
        "no_maps": args["noMaps"],
        "animation": args["animation"],
        "omp": args["omp"],
        "mpi": args["mpi"],
        "n_threads": args["nThreads"],
        "n_proces": args["nProces"]
    }

    # Escribir el archivo de configuración
    configuration = {'MAP': configuration}
    
    # Escribir un archivo .yaml
    try:
        with open('config/config.yaml', 'w') as yamlfile:
            yaml.dump(configuration, yamlfile, default_flow_style=False, sort_keys=False)
        print("\n✅Archivo de configuración .yaml creado exitosamente.\n")
        send_message("config/config.yaml", "requests", "handler.start")
        print("\n✅Archivo de configuración .yaml enviado a la cola de RabbitMQ.\n")
    except Exception as e:
        print(f"\n❌ Error al escribir el archivo de configuración: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()