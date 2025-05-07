import subprocess
import sys
import os
import json

sys.path.append("/app/")

from utils.rabbitMQ.receive_messages import receive_messages
from utils.rabbitMQ.send_message import send_message
from utils.rabbitMQ.process_body import process_body
from utils.rabbitMQ.create_message import create_message
from utils.minio.upload_files import upload_files_to_request_hash
from utils.clean_folder_files import clean_directory
from utils.consts.consts import STATUS_OK, STATUS_ERROR, MESSAGE_NO_COMPILE


def handle_message(body):
    """Process the message received by the general handler, and launch the algorithm execution."""

    raw_data = process_body(body)
    data = json.loads(raw_data)

    if data["request_type"] == MESSAGE_NO_COMPILE:
        print("\n[ ] Se recibió un mensaje de no compilar")
    else:
        print("\n[ ] Se recibió un mensaje de ejecución normal")

    if data["request_type"] != MESSAGE_NO_COMPILE:
        os.makedirs("build", exist_ok=True)

        subprocess.run(["cmake", ".."], cwd="build")

        build_cmd = ["cmake", "--build", "."]
        process = subprocess.Popen(
            build_cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            cwd="build",
        )
        stdout, stderr = process.communicate()

        if process.returncode == 0:
            print(stdout)
            print("\n✅ Build completado exitosamente.")
        else:
            print(stderr)
            print("\n❌ Error al ejecutar el build:")
            message = {"exec_status": STATUS_ERROR, "exec_message": "Error al compilar"}
            send_message(
                create_message(STATUS_OK, "", message), "notifications", "notify.handler"
            )
            return False

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
        #save the files in minio
        upload_files_to_request_hash(data["request_hash"], local_folder="./out/"+data["request_hash"])
        print("\n[ ] Archivos subidos a minio.")
        clean_directory("./out/"+data["request_hash"])
        send_message(
            create_message(STATUS_OK, "", message), "notifications", "notify.handler"
        )
        return True
    else:
        print("\n❌ Ejecución fallida.")
        message = {"exec_status": STATUS_ERROR, "exec_message": result.stderr}
        send_message(
            create_message(STATUS_OK, "", message), "notifications", "notify.handler"
        )
        return False


if __name__ == "__main__":
    receive_messages("execution_queue", "execution.algorithm", callback=handle_message)
