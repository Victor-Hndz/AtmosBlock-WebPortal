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
from utils.rabbitMQ.process_body import process_body
from utils.rabbitMQ.create_message import create_message
from utils.consts.consts import EXEC_FILE, STATUS_OK, STATUS_ERROR, MESSAGE_NO_COMPILE, MESSAGE_DEBUG



def init(file_name):
    '''Inicializa las variables necesarias para el procesamiento del archivo .yaml.'''
    # Read the configuration file (yaml)
    with open(file_name, 'r') as yamlfile:
        config = yaml.load(yamlfile, Loader=yaml.FullLoader)
    print("\n✅ Archivo de configuración .yaml leído exitosamente.\n")
        
    # Extract all
    file_name = config["MAP"]["file"]
    maps = config["MAP"]["maps"]
    es_max = config["MAP"]["es_max"]
    area = config["MAP"]["area"]
    levels = config["MAP"]["levels"]
    file_format = config["MAP"]["file_format"]
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
    # file_name = file_name.split("/")[-1]

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

    return file_name, maps, es_max, area, levels, file_format, debug, no_compile, no_execute, no_maps, animation, omp, mpi, tracking, n_threads, n_processes


def handle_execution_message(body):
    '''Procesa el mensaje recibido por el handler, si es un archivo .yaml válido, lo retorna.'''
    data = process_body(body)
    message = json.loads(data)
    
    if message["exec_status"] == STATUS_ERROR:
        print("\n❌ Error al ejecutar el programa.\n")
        print("\t❌ Error: ", message["exec_message"])
        return None
    elif message["exec_status"] == STATUS_OK:
        print("\n[ ] Se recibió un mensaje de ejecución: ", message["exec_message"])
        print("\n✅ Ejecución completada exitosamente.\n")
    
    # [int(lat) for lat in lat_range]
    # [int(lon) for lon in lon_range]
    
    # max_times = len(date_from_nc(file_name))
    # generate_map(file_name, es_max, max_times, levels, lat_range, lon_range, file_format)        
       

def process_file(file_name, area, debug, no_compile, no_execute, omp, mpi, n_threads, n_processes):
    '''Procesa el archivo .yaml y ejecuta el programa en C.'''
    lat_range = [int(area[2]), int(area[0])]
    lon_range = [int(area[1]), int(area[3])]
    
    print("\n✅ Ejecutando el programa para el archivo:", file_name)

    if not no_execute:
        if omp and not mpi:
            cmd = [EXEC_FILE, file_name, str(lat_range[0]), str(lat_range[1]), str(lon_range[0]), str(lon_range[1]), n_threads]
            debug_cmd = ["gdb", "--args", EXEC_FILE, file_name, str(lat_range[0]), str(lat_range[1]), str(lon_range[0]), str(lon_range[1]), n_threads]
        if mpi and not omp:
            cmd = ["mpirun", "-n", n_processes, EXEC_FILE, file_name, str(lat_range[0]), str(lat_range[1]), str(lon_range[0]), str(lon_range[1]), "1"]
            debug_cmd = ["gdb", "--args", "mpirun", "-n", n_processes, EXEC_FILE, file_name, str(lat_range[0]), str(lat_range[1]), str(lon_range[0]), str(lon_range[1]), "1"]    
        if omp and mpi:
            cmd = ["mpirun", "-n", n_processes, EXEC_FILE, file_name, str(lat_range[0]), str(lat_range[1]), str(lon_range[0]), str(lon_range[1]), n_threads]
            debug_cmd = ["gdb", "--args", "mpirun", "-n", n_processes, EXEC_FILE, file_name, str(lat_range[0]), str(lat_range[1]), str(lon_range[0]), str(lon_range[1]), n_threads]
        else:
            cmd = [EXEC_FILE, file_name, str(lat_range[0]), str(lat_range[1]), str(lon_range[0]), str(lon_range[1]), "1"]
            debug_cmd = ["gdb", "--args", EXEC_FILE, file_name, str(lat_range[0]), str(lat_range[1]), str(lon_range[0]), str(lon_range[1]), "1"]
        
        print("\n[] Enviando mensaje a la cola de ejecución...")
        
        if no_compile:
            data = {"request_type": MESSAGE_NO_COMPILE, "cmd": cmd}
        elif debug:
            data = {"request_type": MESSAGE_DEBUG, "cmd": debug_cmd}
        else:
            data = {"request_type": "", "cmd": cmd}
        
        send_message(create_message(STATUS_OK, "", data), "execution", "execution.algorithm")
        receive_messages("notifications_queue", "notify.handler", callback=handle_execution_message)
        
        
def handle_config_message(body):
    '''Procesa el mensaje recibido por el handler, si es un archivo .yaml válido, lo retorna.'''
    data = process_body(body)
    message = json.loads(data)
    print(f"\n✅ Mensaje recibido en handler: {message}")
    
    if not message.endswith(".yaml"):
        print("\tMensaje inválido. Se esperaba un archivo .yaml existente.")
        return 

    print("\n✅ Archivo válido recibido. Procesando...")
    file_name, maps, es_max, area, levels, file_format, debug, no_compile, no_execute, no_maps, animation, omp, mpi, tracking, n_threads, n_processes = init(message)
    
    print("Archivo: ", file_name)

    process_file(file_name, area, debug, no_compile, no_execute, omp, mpi, n_threads, n_processes)



# def generate_map(file_name, es_max, max_times, levels, lat_range, lon_range, file_format):
#     if not no_maps:
#         for m in maps:
#             for e in es_max:
#                 for t in times:
#                     if t >= max_times:
#                         break
#                     DataType_map[DataType(m)](file_name, e, t, levels, lat_range, lon_range, file_format)
                    

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
    #     args = [str(arg) for arg in [file_name, times, levels, area, file_format]]
    #     command = ['python', 'tracking/temp_tracking.py', *args]
        
    #     subprocess.run(command)
