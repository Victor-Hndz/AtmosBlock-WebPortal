import yaml
import sys
import json

sys.path.append('/app/')

from utils.enums.DataType import DataType
# from utils.enums.DataTypeMap import DataType_map

from utils.map_utils import date_from_nc
# from utils.gif_generator import svg_to_gif_folder

from utils.rabbitMQ.send_message import send_message
from utils.rabbitMQ.receive_messages import receive_messages


EXEC_FILE = "./FAST-IBAN"



def init(file_name):
    '''Inicializa las variables necesarias para el procesamiento del archivo .yaml.'''
    # Read the configuration file (yaml)
    with open(file_name, 'r') as yamlfile:
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
    # file = file.split("/")[-1]

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


def handle_execution_message(body):
    '''Procesa el mensaje recibido por el handler, si es un archivo .yaml válido, lo retorna.'''
    message = json.loads(body)
    print(f"\n\tMensaje recibido en exec handler: {message}")
    
    if message[0] == "error":
        print("\tError: ", message[1])
        return None
    elif message[0] == "return_code":
        print("Se recibió un mensaje de ejecución: ", message)
    
    # [int(lat) for lat in lat_range]
    # [int(lon) for lon in lon_range]
    
    return_code = message[1]
    
    # max_times = len(date_from_nc(file))
    
    if return_code == 0:
        print("Ejecución completada exitosamente.")
        # generate_map(file, es_max, max_times, levels, lat_range, lon_range, file_format)        
    else:
        print("Error al ejecutar el programa.")
        

def process_file(file, area, debug, no_execute, omp, mpi, n_threads, n_processes):
    '''Procesa el archivo .yaml y ejecuta el programa en C.'''
    lat_range = [int(area[2]), int(area[0])]
    lon_range = [int(area[1]), int(area[3])]
    
    print("Ejecutando el programa para el archivo:", file)
    
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
        
        print("Enviando mensaje a la cola de ejecución...")
        if not debug:
            message = " ".join(cmd)
        else:
            message = " ".join(debug_cmd)
            
        send_message(message, "execution", "execution.algorithm")
        receive_messages("notifications_queue", "notify.handler", callback=handle_execution_message)
        
        

def handle_config_message(body):
    '''Procesa el mensaje recibido por el handler, si es un archivo .yaml válido, lo retorna.'''
    message = json.loads(body)
    print(f"\n\tMensaje recibido en handler: {message}")
    
    if not message.endswith(".yaml"):
        print("\tMensaje inválido. Se esperaba un archivo .yaml existente.")
        return 

    print("Archivo válido recibido. Procesando...")
    file, maps, es_max, times, area, levels, file_format, output, debug, no_compile, no_execute, no_maps, animation, omp, mpi, tracking, n_threads, n_processes = init(message)
    
    print("Archivo: ", file)

    process_file(file, area, debug, no_execute, omp, mpi, n_threads, n_processes)



# def generate_map(file, es_max, max_times, levels, lat_range, lon_range, file_format):
#     if not no_maps:
#         for m in maps:
#             for e in es_max:
#                 for t in times:
#                     if t >= max_times:
#                         break
#                     DataType_map[DataType(m)](file, e, t, levels, lat_range, lon_range, file_format)
                    

if __name__ == "__main__":
    receive_messages("config_queue", "handler.start", callback=handle_config_message)
    
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
