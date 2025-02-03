import subprocess
import yaml
import sys

sys.path.append('/app/')

from utils.enums.DataType import DataType
# from utils.enums.DataTypeMap import DataType_map

from utils.map_utils import date_from_nc
# from utils.gif_generator import svg_to_gif_folder

from utils.rabbitMQ.send_message import send_message
from utils.rabbitMQ.receive_single_message import receive_single_message


EXEC_FILE = "./execution/FAST-IBAN"


def process_message(message):
    # Se obtiene el mensaje y se procesa
    print(f"\n\tMensaje recibido en handler: {message}")
    send_message("Mensaje recibido")
    return message


def init():
    # Read the configuration file (yaml)
    with open('config/config.yaml', 'r') as yamlfile:
        config = yaml.load(yamlfile, Loader=yaml.FullLoader)
    print("Archivo de configuración .yaml leído exitosamente.")
        
    # Extract all
    file = config["MAP"]["file"]
    maps = config["MAP"]["maps"]
    es_max = config["MAP"]["es_max"]
    times = config["MAP"]["times"]
    area = config["MAP"]["area"]
    levels = config["MAP"]["levels"]
    file_format = config["MAP"]["file_format"]
    output = config["MAP"]["output"]
    tracking = config["MAP"]["tracking"]
    debug = config["MAP"]["debug"]
    no_compile = config["MAP"]["no_compile"]
    no_execute = config["MAP"]["no_execute"]
    no_maps = config["MAP"]["no_maps"]
    animation = config["MAP"]["animation"]
    omp = config["MAP"]["omp"]
    mpi = config["MAP"]["mpi"]
    n_threads = config["MAP"]["n_threads"]
    n_processes = config["MAP"]["n_proces"]
        
    # Get the last part of the path
    file = file.split("/")[-1]

    # Compile the C code
    # if not no_compile:
    #     cmd = ["cmake", "--build", execution_path]
    #     process = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    #     stdout, stderr = process.communicate()

    #     if process.returncode == 0:
    #         print(stdout)  # Mostrar la salida del comando
    #         print("Build completado exitosamente.")
    #     else:
    #         print(stderr)  # Mostrar el mensaje de error
    #         print("Error al ejecutar el build:")
    #         exit(1)

    return file, maps, es_max, times, area, levels, file_format, output, debug, no_compile, no_execute, no_maps, animation, omp, mpi, tracking, n_threads, n_processes


def process_file():
    lat_range = [int(area[2]), int(area[0])]
    lon_range = [int(area[1]), int(area[3])]
    
    return_code = None
    if not no_execute:
        if omp and not mpi:
            cmd = [EXEC_FILE, file, str(lat_range[0]), str(lat_range[1]), str(lon_range[0]), str(lon_range[1]), n_threads]
            debug_cmd = ["gdb", "--args", EXEC_FILE, file, str(lat_range[0]), str(lat_range[1]), str(lon_range[0]), str(lon_range[1]), n_threads]
        if mpi and not omp:
            cmd = ["mpirun", "-n", n_processes, EXEC_FILE, file, str(lat_range[0]), str(lat_range[1]), str(lon_range[0]), str(lon_range[1]), "1"]
            debug_cmd = ["gdb", "--args", "mpirun", "-n", n_processes, EXEC_FILE, file, str(lat_range[0]), str(lat_range[1]), str(lon_range[0]), str(lon_range[1]), "1"]    
        if omp and mpi:
            cmd = ["mpirun", "-n", n_processes, EXEC_FILE, file, str(lat_range[0]), str(lat_range[1]), str(lon_range[0]), str(lon_range[1]), n_threads]
            debug_cmd = ["gdb", "--args", "mpirun", "-n", n_processes, EXEC_FILE, file, str(lat_range[0]), str(lat_range[1]), str(lon_range[0]), str(lon_range[1]), n_threads]
        else:
            cmd = [EXEC_FILE, file, str(lat_range[0]), str(lat_range[1]), str(lon_range[0]), str(lon_range[1]), "1"]
            debug_cmd = ["gdb", "--args", EXEC_FILE, file, str(lat_range[0]), str(lat_range[1]), str(lon_range[0]), str(lon_range[1]), "1"]
        
        if not debug:
            return_code = subprocess.call(cmd)
        else:
            return_code = subprocess.call(debug_cmd)
        
    [int(lat) for lat in lat_range]
    [int(lon) for lon in lon_range]
    
    max_times = len(date_from_nc(file))
    
    if return_code == 0 or no_execute:
        print("Ejecución completada exitosamente para el archivo:", file)
        generate_map(file, es_max, max_times, levels, lat_range, lon_range, file_format)        
    else:
        print("Error al ejecutar el programa para el archivo:", file)
        

# def generate_map(file, es_max, max_times, levels, lat_range, lon_range, file_format):
#     if not no_maps:
#         for m in maps:
#             for e in es_max:
#                 for t in times:
#                     if t >= max_times:
#                         break
#                     DataType_map[DataType(m)](file, e, t, levels, lat_range, lon_range, file_format)
                    

if __name__ == "__main__":
    receive_single_message(callback=process_message)
    
    file, maps, es_max, times, area, levels, file_format, output, debug, no_compile, no_execute, no_maps, animation, omp, mpi, tracking, n_threads, n_processes = init()
    
    print("Archivo: ", file)
    
    #process_file()
    
    # if(animation):
    #     print("Generando animación...")
    #     # Generate the animation
    #     input_gif_folder = "out/"
    #     out_gif_folder = "out/gif/gif.gif"
    #     svg_to_gif_folder(input_gif_folder, out_gif_folder)
        
    # if(tracking):
    #     print("Generando seguimiento...")
    #     # Generate the tracking
    #     args = [str(arg) for arg in [file, times, levels, area, file_format]]
    #     command = ['python', 'tracking/temp_tracking.py', *args]
        
    #     subprocess.run(command)
