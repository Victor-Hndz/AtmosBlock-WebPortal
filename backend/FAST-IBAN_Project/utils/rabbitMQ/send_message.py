import pika
import os
from dotenv import load_dotenv

# Cargar variables desde .env
load_dotenv()

def send_message(message, queue_name=None):
    """ Envía un mensaje a RabbitMQ usando credenciales desde .env """
    
    # Obtener credenciales desde .env
    host = os.getenv("RABBITMQ_HOST", "localhost")
    user = os.getenv("RABBITMQ_USER", "guest")
    password = os.getenv("RABBITMQ_PASSWORD", "guest")
    queue_name = queue_name or os.getenv("RABBITMQ_CONF_QUEUE", "default_queue")

    # Configurar credenciales
    credentials = pika.PlainCredentials(user, password)
    connection = pika.BlockingConnection(pika.ConnectionParameters(host=host, credentials=credentials))
    channel = connection.channel()

    # Declarar la cola (durable para persistencia)
    channel.queue_declare(queue=queue_name, durable=True)

    # Publicar mensaje
    channel.basic_publish(
        exchange='',
        routing_key=queue_name,
        body=message,
        properties=pika.BasicProperties(delivery_mode=2)  # Persistente
    )

    print(f" [✔] Mensaje enviado a '{queue_name}': {message}")
    connection.close()
