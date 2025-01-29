import os
import yaml
import sys

sys.path.append('/app/')

from utils.api_request import request_data

ARGS_FILE = "./configurator/exec_args.yaml"
API_FOLDER = "./config/data"

# Lista de argumentos permitidos
ARGUMENTS = [
    "variable", "pressure_levels", "years", "months", "days", "hours",
    "area", "types", "ranges", "levels", "instants",
    "all", "format", "out", "tracking", "debug", "no_compile", "no_execute",
    "no_compile_execute", "no_maps", "animation", "omp", "mpi",
    "n_threads", "n_proces"
]


# Función para cargar argumentos desde un archivo YAML
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
    variable = variable or []
    pressure_levels = pressure_levels or []
    years = format_list(years or [])
    months = format_list(months or [])
    days = format_list(days or [])
    hours = format_list(hours or [])

    # Construcción del nombre del archivo
    variable_part = "-".join(variable) if len(variable) > 1 else variable[0]
    pressure_part = "-".join(pressure_levels) + "hPa" if len(pressure_levels) > 1 else pressure_levels[0] + "hPa"
    year_part = "-".join(years)
    month_part = "-".join(months)
    day_part = f"({format_range(days)})"
    hour_part = "-".join(hours) + "UTC"

    return f"{API_FOLDER}/{variable_part}_{pressure_part}_{year_part}-{month_part}-{day_part}_{hour_part}.nc"


def main():
    args = load_args_from_file(ARGS_FILE)
    
    print("\n✅ Argumentos cargados y validados con éxito.\n")
    
    file = mount_file_name(args["variable"], args["pressure_levels"], args["years"], args["months"], args["days"], args["hours"])
    
    #buscar si el archivo existe
    if not os.path.exists(file):
        #llamar a la API y bajarlo
        print(f"El archivo {file} no existe, se procederá a descargarlo.")
        request_data(args["variable"], args["years"], args["months"], args["days"], args["hours"], args["pressure_levels"], args["area"], file)
        print(f"\n✅ Archivo {file} descargado con éxito.")
        
    
    # Crear el diccionario de configuración para cada mapa
    configuration = {
        "file": file,
        "maps": args["types"],
        "es_max": args["ranges"],
        "times": args["instants"],
        "area": args["area"],
        "levels": args["levels"],
        "file_format": args["format"],
        "output": args["out"],
        "tracking": args["tracking"],
        "debug": args["debug"],
        "no_compile": args["no_compile"],
        "no_execute": args["no_execute"],
        "no_maps": args["no_maps"],
        "animation": args["animation"],
        "omp": args["omp"],
        "mpi": args["mpi"],
        "n_threads": args["n_threads"],
        "n_proces": args["n_proces"]
    }

    # Escribir el archivo de configuración
    configuration = {'MAP': configuration}
    
    # Escribir un archivo .yaml
    with open('config/config.yaml', 'w') as yamlfile:
        yaml.dump(configuration, yamlfile, default_flow_style=False, sort_keys=False)
    print("\n✅Archivo de configuración .yaml creado exitosamente.\n")


if __name__ == "__main__":
    main()
