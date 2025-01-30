import pika
import os

from dotenv import load_dotenv
from utils.rabbitMQ.start_conection import start_conection

# Cargar variables desde .env
load_dotenv()

def receive_messages(callback, queue_name=None):
    """ Escucha mensajes en RabbitMQ y ejecuta un callback cuando llega un mensaje """

    # Obtener credenciales desde .env
    host = os.getenv("RABBITMQ_HOST", "rabbitmq")
    port = os.getenv("RABBITMQ_PORT", 5672)
    user = os.getenv("RABBITMQ_USER", "guest")
    password = os.getenv("RABBITMQ_PASSWORD", "guest")
    queue_name = queue_name or os.getenv("RABBITMQ_CONF_QUEUE", "default_queue")
    
    # Configurar credenciales
    credentials = pika.PlainCredentials(user, password)
    
    _connection, channel = start_conection(credentials, host, port)

    if channel:
        # Declarar la cola
        channel.queue_declare(queue=queue_name, durable=True)
        
        print(f" [ ] Cola '{queue_name}' declarada")

        # Callback para recibir mensajes
        def on_message(ch, method, properties, body):
            print(f" [ ] Mensaje recibido en '{queue_name}': {body.decode()}")
            callback(body.decode())  # Llamar a la función del usuario
            ch.basic_ack(delivery_tag=method.delivery_tag)  # Confirmar recepción

        channel.basic_consume(queue=queue_name, on_message_callback=on_message)

        print(f" [*] Escuchando mensajes en '{queue_name}'. Presiona CTRL+C para salir.")
        channel.start_consuming()
    else:
        print(" [ ] No se pudo establecer conexión con RabbitMQ. Abortando.")
