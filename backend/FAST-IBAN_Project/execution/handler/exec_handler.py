import subprocess
import sys
import os
import asyncio

sys.path.append("/app/")

from utils.rabbitMQ.rabbitmq import RabbitMQ
from utils.rabbitMQ.process_body import process_body
from utils.rabbitMQ.create_message import create_message
from utils.rabbitMQ.notify_updates import notify_update
from utils.rabbitMQ.rabbit_consts import NOTIFICATIONS_EXCHANGE, NOTIFY_HANDLER_KEY, EXECUTION_ALGORITHM_QUEUE, NOTIFY_EXECUTION
from utils.minio.upload_files import upload_files_to_request_hash
from utils.consts.consts import API_FOLDER, EXEC_FILE, STATUS_OK, STATUS_ERROR

# Build folder of the C core for each variable.
BUILD_FOLDERS = {
    "geopotential": "./code/build",
    "temperature": "./code_t/build",
}


def _entero(data, clave, minimo, maximo):
    """Integer field of the message within [minimo, maximo]; a bool is not an integer here."""
    valor = data.get(clave)
    if type(valor) is not int or not minimo <= valor <= maximo:
        raise ValueError(f"{clave} no válido: {valor!r}")
    return valor


def argv_de(data):
    """
    Validate the execution parameters of a message and build the argv of the C core (V5/WEB-301).

    The message carries parameters, never a command: binary, mpirun and output directory are fixed here.
    request_hash is already validated by process_body (V14/WEB-302). Raises ValueError if a parameter is not valid.
    """
    variable = data.get("variable_name")
    if not isinstance(variable, str) or variable not in BUILD_FOLDERS:
        raise ValueError(f"Variable no soportada: {variable}")

    file = data.get("file")
    data_folder = os.path.realpath(API_FOLDER)
    if (
        not isinstance(file, str)
        or not file.endswith(".nc")
        or os.path.commonpath([data_folder, os.path.realpath(file)]) != data_folder
    ):
        raise ValueError(f"Fichero no válido: {file!r}")

    lat_min, lat_max = _entero(data, "lat_min", -90, 90), _entero(data, "lat_max", -90, 90)
    lon_min, lon_max = _entero(data, "lon_min", -180, 180), _entero(data, "lon_max", -180, 180)
    if lat_min > lat_max or lon_min > lon_max:
        raise ValueError(f"Área no válida: lat [{lat_min}, {lat_max}], lon [{lon_min}, {lon_max}]")

    omp, mpi = data.get("omp"), data.get("mpi")
    if type(omp) is not bool or type(mpi) is not bool:
        raise ValueError(f"omp y mpi deben ser booleanos: {omp!r}, {mpi!r}")
    n_threads, n_proces = (
        None if data.get(clave) is None else _entero(data, clave, 1, float("inf")) for clave in ("n_threads", "n_proces")
    )

    # WEB-218: each mode has its own binary (./FAST-IBAN, _omp, _mpi, _omp_mpi). Only the geopotential core
    # (code/) builds the parallel variants; the temperature core (code_t/) is serial only.
    parallel = variable == "geopotential"
    omp, mpi = omp and parallel, mpi and parallel

    # Defaults and cap from this container's CPU count. The output is invariant to the number of threads and
    # processes (ALG-004, ALG-206), so capping them does not change the results.
    cpus = os.cpu_count() or 1
    if omp and mpi:
        processes = n_proces or 2
        threads = n_threads or max(1, cpus // processes)
    else:
        processes = n_proces or cpus
        threads = n_threads or cpus
    processes, threads = min(processes, cpus), min(threads, cpus)

    out_dir = "./out/" + data["request_hash"] + "/"
    binary = EXEC_FILE + ("_omp" if omp else "") + ("_mpi" if mpi else "")
    argv = [binary, file, str(lat_min), str(lat_max), str(lon_min), str(lon_max), out_dir, str(threads) if omp else "1"]
    return ["mpirun", "-n", str(processes), *argv] if mpi else argv


async def notify_execution(rabbitmq_client, request_hash, exec_status, exec_message):
    """Notify the general handler of the result of the execution of a request (WEB-222: with its hash)."""
    message = {
        "request_type": NOTIFY_EXECUTION,
        "request_hash": request_hash,
        "exec_status": exec_status,
        "exec_message": exec_message,
    }
    await rabbitmq_client.publish(
        NOTIFICATIONS_EXCHANGE,
        NOTIFY_HANDLER_KEY,
        create_message(STATUS_OK, "", message)
    )


async def handle_message(body, rabbitmq_client):
    """Process the message received by the general handler, and launch the algorithm execution."""

    data = process_body(body)

    # WEB-207: any failure is notified as an execution error instead of leaving the request hanging.
    try:
        return await run_algorithm(data, rabbitmq_client)
    except Exception as e:
        print(f"\n❌ Error inesperado en la ejecución: {e}")
        await notify_execution(rabbitmq_client, data.get("request_hash"), STATUS_ERROR, f"Error inesperado en la ejecución: {e}")
        return False


async def run_algorithm(data, rabbitmq_client):
    """Compile and run the C core for the requested variable, then upload the results."""

    request_hash = data["request_hash"]
    try:
        run_cmd = argv_de(data)
    except ValueError as e:
        print(f"\n❌ Parámetros de ejecución no válidos: {e}")
        await notify_execution(rabbitmq_client, request_hash, STATUS_ERROR, str(e))
        return False
    build_folder = BUILD_FOLDERS[data["variable_name"]]

    await notify_update(rabbitmq_client, request_hash, 1, "EXEC: Compilando algoritmo.")

    os.makedirs(build_folder, exist_ok=True)
    print("\n[ ] Compilando el algoritmo en la carpeta: ", build_folder)

    subprocess.run(["cmake", ".."], cwd=build_folder)

    build_cmd = ["cmake", "--build", "."]
    process = subprocess.Popen(
        build_cmd,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        cwd=build_folder,
    )
    stdout, stderr = process.communicate()

    if process.returncode == 0:
        print(stdout)
        print("\n✅ Build completado exitosamente.")
    else:
        print("\n❌ Error al ejecutar el build:")
        await notify_execution(rabbitmq_client, request_hash, STATUS_ERROR, "Error al compilar")
        return False

    await notify_update(rabbitmq_client, request_hash, 1, "EXEC: Ejecutando algoritmo.")

    print("\n[ ] Ejecutando comando: ", run_cmd)
    result = subprocess.run(run_cmd, capture_output=True, text=True, cwd=build_folder)

    if result.returncode == 0:
        print("\n✅ Ejecución exitosa.")

        #save the files in minio
        upload_files_to_request_hash(request_hash, local_folder="./out/"+request_hash)
        print("\n[ ] Archivos subidos a minio.")

        await notify_execution(rabbitmq_client, request_hash, STATUS_OK, "Ejecutado correctamente")
        return True
    else:
        print("\n❌ Ejecución fallida.")
        await notify_execution(rabbitmq_client, request_hash, STATUS_ERROR, result.stderr)
        return False


if __name__ == "__main__":
    async def main():
        # Initialize the RabbitMQ connection
        rabbitmq_client = RabbitMQ()
        await rabbitmq_client.initialize()

        # Create a wrapper to pass the rabbitmq client to the handler
        async def message_handler(body):
            return await handle_message(body, rabbitmq_client)

        # Start consuming messages
        await rabbitmq_client.consume(
            EXECUTION_ALGORITHM_QUEUE,
            callback=message_handler
        )

        # Keep the application running
        try:
            # Run forever
            await asyncio.Future()
        except KeyboardInterrupt:
            print("Shutting down...")
        finally:
            # Close the connection when done
            await rabbitmq_client.close()

    # Run the async main function
    asyncio.run(main())
