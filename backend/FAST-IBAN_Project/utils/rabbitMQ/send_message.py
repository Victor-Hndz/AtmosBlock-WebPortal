import pika
import os

from dotenv import load_dotenv
from utils.rabbitMQ.start_conection import start_conection

# Cargar variables desde .env
load_dotenv()

def send_message(message, queue_name=None):
    """ Envía un mensaje a RabbitMQ usando credenciales desde .env """
    
    # Obtener credenciales desde .env
    host = os.getenv("RABBITMQ_HOST", "rabbitmq")
    port = os.getenv("RABBITMQ_PORT", 5672)
    user = os.getenv("RABBITMQ_USER", "guest")
    password = os.getenv("RABBITMQ_PASSWORD", "guest")
    queue_name = queue_name or os.getenv("RABBITMQ_CONF_QUEUE", "default_queue")
    
    # print(f" [ ] Enviando mensaje a '{queue_name}': {message}")
    # print(f" [ ] host: {host}")
    # print(f" [ ] port: {port}")
    # print(f" [ ] user: {user}")
    # print(f" [ ] password: {password}")
    
    # Configurar credenciales
    credentials = pika.PlainCredentials(user, password)
    
    connection, channel = start_conection(credentials, host, port)

    if channel:
        # Declarar la cola (durable para persistencia)
        channel.queue_declare(queue=queue_name, durable=True)
        
        print(f" [ ] Cola '{queue_name}' declarada")

        # Publicar mensaje
        channel.basic_publish(
            exchange='',
            routing_key=queue_name,
            body=message,
            properties=pika.BasicProperties(delivery_mode=2)  # Persistente
        )

        print(f" [✔] Mensaje enviado a '{queue_name}': {message}")
        connection.close()
    else:
        print(" [ ] No se pudo establecer conexión con RabbitMQ. Abortando.")