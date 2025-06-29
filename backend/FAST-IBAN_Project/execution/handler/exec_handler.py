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


async def handle_message(body, rabbitmq_client):
    """Process the message received by the general handler, and launch the algorithm execution."""
    
    await notify_update(rabbitmq_client, 1, "EXEC: Compilando algoritmo.")

    data = process_body(body)
    
    if data["variable_name"] == "geopotential":
        build_folder = "./code/build"
    elif data["variable_name"] == "temperature":
        build_folder = "./code_t/build"
        
    # print("\n[ ] Contenido de code_t: ", os.listdir("./"))
        
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
        message = {"request_type": NOTIFY_EXECUTION, "exec_status": STATUS_ERROR, "exec_message": "Error al compilar"}
        await rabbitmq_client.publish(
            NOTIFICATIONS_EXCHANGE, 
            NOTIFY_HANDLER_KEY, 
            create_message(STATUS_OK, "", message)
        )
        return False

    run_cmd = data["cmd"]

    await notify_update(rabbitmq_client, 1, "EXEC: Ejecutando algoritmo.")
        
    print("\n[ ] Ejecutando comando: ", run_cmd)
    result = subprocess.run(run_cmd, capture_output=True, text=True, cwd=build_folder)
    
    # print("\n[ ] Resultado de la ejecución:")
    # print(f"Código de retorno: {result.returncode}")
    
    # print("Salida estándar (stdout):")
    # print(result.stdout)

    # print("Salida de error (stderr):")
    # print(result.stderr)

    if result.returncode == 0:
        print("\n✅ Ejecución exitosa.")
        message = {"request_type": NOTIFY_EXECUTION, "exec_status": STATUS_OK, "exec_message": "Ejecutado correctamente"}
        
        #save the files in minio
        upload_files_to_request_hash(data["request_hash"], local_folder="./out/"+data["request_hash"])
        print("\n[ ] Archivos subidos a minio.")
        
        await rabbitmq_client.publish(
            NOTIFICATIONS_EXCHANGE, 
            NOTIFY_HANDLER_KEY, 
            create_message(STATUS_OK, "", message)
        )
        return True
    else:
        print("\n❌ Ejecución fallida.")
        message = {"request_type": NOTIFY_EXECUTION, "exec_status": STATUS_ERROR, "exec_message": result.stderr}
        await rabbitmq_client.publish(
            NOTIFICATIONS_EXCHANGE, 
            NOTIFY_HANDLER_KEY, 
            create_message(STATUS_OK, "", message)
        )
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
