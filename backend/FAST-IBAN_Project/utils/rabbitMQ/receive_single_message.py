import pika
import os
from dotenv import load_dotenv
from utils.rabbitMQ.start_conection import start_conection

# Cargar variables desde .env
load_dotenv()

def receive_single_message(callback, queue_name=None):
    """ Recibe un único mensaje de RabbitMQ, ejecuta un callback y finaliza """

    # Obtener credenciales desde .env
    host = os.getenv("RABBITMQ_HOST", "rabbitmq")
    port = os.getenv("RABBITMQ_PORT", 5672)
    user = os.getenv("RABBITMQ_DEFAULT_USER", "guest")
    password = os.getenv("RABBITMQ_DEFAULT_PASS", "guest")
    queue_name = queue_name or os.getenv("RABBITMQ_CONF_QUEUE", "default_queue")

    # Configurar credenciales
    credentials = pika.PlainCredentials(user, password)
    connection, channel = start_conection(credentials, host, port)

    if channel:
        # Declarar la cola
        channel.queue_declare(queue=queue_name, durable=True)

        print(f" [ ] Esperando un único mensaje en la cola '{queue_name}'.")

        # Intentar obtener un solo mensaje
        method_frame, _header_frame, body = channel.basic_get(queue=queue_name, auto_ack=False)

        if method_frame:
            print(f" [✔] Mensaje recibido en '{queue_name}': {body.decode()}")
            callback(body.decode())  # Llamar a la función del usuario
            channel.basic_ack(delivery_tag=method_frame.delivery_tag)  # Confirmar recepción
        else:
            print(" [ ] No hay mensajes disponibles en la cola.")

        # Cerrar la conexión después de recibir el mensaje
        connection.close()
    else:
        print(" [ ] No se pudo establecer conexión con RabbitMQ. Abortando.")
