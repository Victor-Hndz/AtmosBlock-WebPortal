import subprocess
import sys
import os
import json

sys.path.append('/app/')

from utils.rabbitMQ.receive_messages import receive_messages
from utils.rabbitMQ.send_message import send_message
from utils.rabbitMQ.process_body import process_body
from utils.rabbitMQ.create_message import create_message
from utils.consts.consts import STATUS_OK, STATUS_ERROR, MESSAGE_NO_COMPILE


def handle_message(body):
    '''Procesa el mensaje recibido por el handler, si es un archivo .yaml válido, lo retorna.'''
    raw_data = process_body(body)
    data = json.loads(raw_data)
    
    # print(f"\n\tMensaje recibido en exec handler: {message}")
    
    if data["request_type"] == MESSAGE_NO_COMPILE:
        print("\n[ ] Se recibió un mensaje de no compilar")
    else:
        print("\n[ ] Se recibió un mensaje de ejecución normal")
        
    if data["request_type"] != MESSAGE_NO_COMPILE:
        # Crear el directorio 'build' si no existe
        os.makedirs("build", exist_ok=True)
        
        subprocess.run(["cmake", ".."], cwd="build")
        
        build_cmd = ["cmake", "--build", "."]
        process = subprocess.Popen(build_cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, cwd="build")
        stdout, stderr = process.communicate()

        if process.returncode == 0:
            print(stdout)  # Mostrar la salida del comando
            print("\n✅ Build completado exitosamente.")
        else:
            print(stderr)  # Mostrar el mensaje de error
            print("\n❌ Error al ejecutar el build:")
        
    # return True
    run_cmd = data["cmd"]
    
    print("\n[ ] Ejecutando comando: ", run_cmd)
    result = subprocess.run(run_cmd, capture_output=True, text=True, cwd="build")
    # print("Salida estándar (stdout):")
    # print(result.stdout)

    # print("Salida de error (stderr):")
    # print(result.stderr)
    
    if result.returncode == 0:
        print("\n✅ Ejecución exitosa.")
        message = {"exec_status": STATUS_OK, "exec_message": result.stdout}
        send_message(create_message(STATUS_OK, "", message), "notifications", "notify.handler")
        return True
    else:
        print("\n❌ Ejecución fallida.")
        message = {"exec_status": STATUS_ERROR, "exec_message": result.stderr}
        send_message(create_message(STATUS_OK, "", message), "notifications", "notify.handler")
        return False


def main():
    receive_messages("execution_queue", "execution.algorithm", callback=handle_message)

if __name__ == "__main__":
    main()