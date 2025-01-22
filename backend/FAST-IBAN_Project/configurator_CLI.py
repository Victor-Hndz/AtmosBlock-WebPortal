import argparse
import os
import platform
import yaml
import configparser
from utils.enums import *
from utils.map_utils import time_validator, date_from_nc


# Función para verificar si el o los archivos existen y son válidos
def check_files(file_paths):
    if isinstance(file_paths, str):  # Si solo se pasó un archivo, conviértelo en una lista
        file_paths = [file_paths]
    
    for file_path in file_paths:
        if not os.path.exists(file_path):
            raise argparse.ArgumentTypeError(f"El archivo '{file_path}' no existe.")
        elif not file_path.endswith('.nc'):
            raise argparse.ArgumentTypeError(f"El archivo '{file_path}' no es un archivo .nc válido.")
    return file_paths

# Función para verificar si el número de niveles es válido
def check_levels(levels):
    try:
        levels = int(levels)
        if levels <= 0:
            raise argparse.ArgumentTypeError("El número debe ser un entero positivo")
        return levels
    except ValueError:
        raise argparse.ArgumentTypeError("El número debe ser un entero positivo")

# Función para verificar si el número o números de instantes es válido
def check_instants(instants):
    instants = instants.split("\n")
    try:
        instants = [int(instant) for instant in instants]
        return instants
    except ValueError:
        raise argparse.ArgumentTypeError("Los instantes deben ser enteros")

# Función para verificar el rango de latitud
def check_lat(value):
    try:
        value = int(value)
        if abs(value) > 90:
            raise argparse.ArgumentTypeError("Los valores de latitud deben estar entre -90 y 90")
        return value
    except ValueError:
        raise argparse.ArgumentTypeError("Los valores de latitud deben ser enteros")
    
# Función para verificar el rango de longitud
def check_lon(value):
    try:
        value = int(value)
        if abs(value) > 180:
            raise argparse.ArgumentTypeError("Los valores de longitud deben estar entre -180 y 180")
        return value
    except ValueError:
        raise argparse.ArgumentTypeError("Los valores de longitud deben ser enteros")
    
#Función para verificar la salida de datos
def check_out(value):
    if not os.path.exists(value):
        raise argparse.ArgumentTypeError(f"La ruta de salida '{value}' no existe.")
    return value

# Configurar el parser de argumentos
parser = argparse.ArgumentParser(description="Configuración de archivo CLI")
parser.add_argument('-d', '--data', nargs='+', type=check_files, required=True, help="Archivo de datos en formato .nc")
parser.add_argument('-t', '--type', nargs='+', choices=[t.value for t in DataType], required=True, help="Tipos de datos")
parser.add_argument('-r', '--range', nargs='+', choices=[r.value for r in DataRange], required=False, help="Rangos de datos")
parser.add_argument('-l', '--levels', type=check_levels, required=False, help="Número de niveles")
parser.add_argument('-i', '--instant', nargs="+", type=check_instants, required=False, help="Número de instantes")
parser.add_argument('-la', '--latrange', nargs=2, type=check_lat, required=False, help="Rango de latitud")
parser.add_argument('-lo', '--lonrange', nargs=2, type=check_lon, required=False, help="Rango de longitud")
parser.add_argument('-f', '--format', type=str, choices=[f.value for f in DataFormat], required=False, help="Formato de datos")
parser.add_argument('-o', '--out', type=check_out, required=False, help="Ruta de salida del archivo")
parser.add_argument('--debug', action='store_true', required=False, help="Debug mode del código en C")
parser.add_argument('-nc', '--no-compile', action='store_true', required=False, help="No compilar")
parser.add_argument('-ne', '--no-execute', action='store_true', required=False, help="No ejecutar")
parser.add_argument('-nce', '--no-compile-execute', action='store_true', required=False, help="No compilar y no ejecutar")
parser.add_argument('-nm', '--no-maps', action='store_true', required=False, help="No generar mapas")
parser.add_argument('-a', '--animation', action='store_true', required=False, help="Generar animación de los mapas")
parser.add_argument('-omp', '--omp', action='store_true', required=False, help="Ejecutar usando OpenMP")
parser.add_argument('-mpi', '--mpi', action='store_true', required=False, help="Ejecutar usando MPI")
parser.add_argument('-tr', '--tracking', action='store_true', required=False, help="Ejecutar el seguimiento de formaciones")
parser.add_argument('-nt', '--n-threads', type=check_levels, required=False, help="Número de hilos para la ejecución paralela")
parser.add_argument('-np', '--n-proces', type=check_levels, required=False, help="Número de procesos para la ejecución paralela")

parser.add_argument('--all', action='store_true', required=False, help="Todos los instantes de tiempo")


# Parsear los argumentos
args = parser.parse_args()

# Verificar que no se use -i junto con --all
if args.all and args.instant:
    parser.error("El argumento --all no se puede usar junto con -i")
    
#Verificar que si aparece -omp, aparezca también -nt con un valor válido
if args.omp and not args.n_threads:
    parser.error("El argumento -omp debe ser usado con -nt")
    
if not args.omp and args.n_threads:
    parser.error("El argumento -nt debe ser usado con -omp")
    
if not args.mpi and args.n_proces:
    parser.error("El argumento -np debe ser usado con -mpi")
    
if args.mpi and not args.n_proces:
    parser.error("El argumento -mpi debe ser usado con -np")

if args.no_compile_execute:
    args.no_compile = True
    args.no_execute = True
    
# Convertir args.data a una lista plana de cadenas de texto
args.data = [data_file[0] for data_file in args.data] if args.data else None
args.instant = [int(instant[0]) for instant in args.instant] if args.instant else None


if args.all and not args.instant:
    for file in args.data:
        dates = date_from_nc(file)
        args.instant = list(range(len(dates)))
        print(f"Se han seleccionado los instantes de tiempo {args.instant} para el archivo {file}")
    

#Validar los instantes de tiempo
for file in args.data:
    dates = date_from_nc(file)
    for instant in args.instant:
        print(time_validator(instant, dates))
        

print("Datos recopilados correctamente.")

# Obtener el sistema operativo actual
current_os = platform.system()

# Crear el diccionario de configuración para cada mapa
configuration = {
    "files": args.data,
    "maps": args.type,
    "es_max": args.range if args.range else None,
    "times": args.instant if args.instant else None,
    "lat_range": args.latrange if args.latrange else None,
    "lon_range": args.lonrange if args.lonrange else None,
    "levels": args.levels if args.levels else None,
    "file_format": args.format if args.format else None,
    "output": args.out if args.out else None,
    "debug": args.debug,
    "no_compile": args.no_compile,
    "no_execute": args.no_execute,
    "no_maps": args.no_maps,
    "animation": args.animation,
    "omp": args.omp,
    "mpi": args.mpi,
    "tracking": args.tracking,
    "n_threads": args.n_threads if args.n_threads else None,
    "n_proces": args.n_proces if args.n_proces else None,
}

#clear the output folder
# if(args.no_execute == False):
#     if os.path.exists("out/"):
#         for file in os.listdir("out/"):
#             os.remove("out/"+file)
#         print("Carpeta de salida limpia exitosamente.")


# Escribir el archivo de configuración
configuration = {'MAP': configuration}
# Escribir un archivo .yaml
with open('config/config.yaml', 'w') as yamlfile:
    yaml.dump(configuration, yamlfile, default_flow_style=False, sort_keys=False)
print("Archivo de configuración .yaml creado exitosamente.")


print("Configuración ejecutada exitosamente.")
exec(open("config_executor.py").read())