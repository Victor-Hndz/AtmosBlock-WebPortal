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
from utils.consts.consts import STATUS_OK, STATUS_ERROR

# Build folder of the C core for each variable.
BUILD_FOLDERS = {
    "geopotential": "./code/build",
    "temperature": "./code_t/build",
}


async def notify_execution(rabbitmq_client, exec_status, exec_message):
    """Notify the general handler of the result of the execution."""
    message = {"request_type": NOTIFY_EXECUTION, "exec_status": exec_status, "exec_message": exec_message}
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
        await notify_execution(rabbitmq_client, STATUS_ERROR, f"Error inesperado en la ejecución: {e}")
        return False


async def run_algorithm(data, rabbitmq_client):
    """Compile and run the C core for the requested variable, then upload the results."""

    build_folder = BUILD_FOLDERS.get(data["variable_name"])
    if build_folder is None:
        print(f"\n❌ Variable no soportada: {data['variable_name']}")
        await notify_execution(rabbitmq_client, STATUS_ERROR, f"Variable no soportada: {data['variable_name']}")
        return False

    await notify_update(rabbitmq_client, data["request_hash"], 1, "EXEC: Compilando algoritmo.")

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
        await notify_execution(rabbitmq_client, STATUS_ERROR, "Error al compilar")
        return False

    run_cmd = data["cmd"]

    await notify_update(rabbitmq_client, data["request_hash"], 1, "EXEC: Ejecutando algoritmo.")

    print("\n[ ] Ejecutando comando: ", run_cmd)
    result = subprocess.run(run_cmd, capture_output=True, text=True, cwd=build_folder)

    if result.returncode == 0:
        print("\n✅ Ejecución exitosa.")

        #save the files in minio
        upload_files_to_request_hash(data["request_hash"], local_folder="./out/"+data["request_hash"])
        print("\n[ ] Archivos subidos a minio.")

        await notify_execution(rabbitmq_client, STATUS_OK, "Ejecutado correctamente")
        return True
    else:
        print("\n❌ Ejecución fallida.")
        await notify_execution(rabbitmq_client, STATUS_ERROR, result.stderr)
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
