import pika
import os
from dotenv import load_dotenv

# Cargar variables desde .env
load_dotenv()

def receive_messages(callback, queue_name=None):
    """ Escucha mensajes en RabbitMQ y ejecuta un callback cuando llega un mensaje """

    # Obtener credenciales desde .env
    host = os.getenv("RABBITMQ_HOST", "localhost")
    user = os.getenv("RABBITMQ_USER", "guest")
    password = os.getenv("RABBITMQ_PASSWORD", "guest")
    queue_name = queue_name or os.getenv("RABBITMQ_CONF_QUEUE", "default_queue")

    # Configurar credenciales
    credentials = pika.PlainCredentials(user, password)
    connection = pika.BlockingConnection(pika.ConnectionParameters(host=host, credentials=credentials))
    channel = connection.channel()

    # Declarar la cola
    channel.queue_declare(queue=queue_name, durable=True)

    # Callback para recibir mensajes
    def on_message(ch, method, properties, body):
        callback(body.decode())  # Llamar a la función del usuario
        ch.basic_ack(delivery_tag=method.delivery_tag)  # Confirmar recepción

    channel.basic_consume(queue=queue_name, on_message_callback=on_message)

    print(f" [*] Escuchando mensajes en '{queue_name}'. Presiona CTRL+C para salir.")
    channel.start_consuming()
