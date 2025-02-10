import subprocess
import sys
import os
import json

sys.path.append('/app/')

from utils.rabbitMQ.receive_messages import receive_messages
from utils.rabbitMQ.send_message import send_message

def handle_message(body):
    '''Procesa el mensaje recibido por el handler, si es un archivo .yaml válido, lo retorna.'''
    message = json.loads(body)
    
    print(f"\n\tMensaje recibido en exec handler: {message}")
    
    if message[0] == None:
        print("\tMensaje inválido.")
        return None
    
    if message[0] == "gdb":
        print("Se recibió un mensaje de debug")
    else:
        print("Se recibió un mensaje de ejecución")
    
    # Crear el directorio 'build' si no existe
    os.makedirs("build", exist_ok=True)
    
    subprocess.run(["cmake", ".."], cwd="build")
    
    build_cmd = ["cmake", "--build", "."]
    process = subprocess.Popen(build_cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, cwd="build")
    stdout, stderr = process.communicate()

    if process.returncode == 0:
        print(stdout)  # Mostrar la salida del comando
        print("Build completado exitosamente.")
    else:
        print(stderr)  # Mostrar el mensaje de error
        print("Error al ejecutar el build:")
        
    # return True
    #from message (string) to list. Separate by spaces
    run_cmd = message.split()
    
    print("Ejecutando comando: ", run_cmd)
    result = subprocess.run(run_cmd, capture_output=True, text=True, cwd="build")
    # print("Salida estándar (stdout):")
    # print(result.stdout)

    # print("Salida de error (stderr):")
    # print(result.stderr)

    print(f"Código de salida: {result.returncode}")
    
    if result.returncode == 0:
        print("Ejecución exitosa.")
        send_message(["return_code", 0], "notifications", "notify.handler")
        return True
    else:
        print("Ejecución fallida.")
        return False


def main():
    receive_messages("execution_queue", "execution.algorithm", callback=handle_message)

if __name__ == "__main__":
    main()