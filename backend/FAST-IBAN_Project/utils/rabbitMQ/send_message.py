import pika
import os
import json

from dotenv import load_dotenv
from utils.rabbitMQ.start_conection import start_conection

# Cargar variables desde .env
load_dotenv()

def send_message(body, exchange, routing_key):
    """ Envía un mensaje a RabbitMQ usando credenciales desde .env """
    
    # Obtener credenciales desde .env
    host = os.getenv("RABBITMQ_HOST", "rabbitmq")
    port = os.getenv("RABBITMQ_PORT", 5672)
    user = os.getenv("RABBITMQ_DEFAULT_USER", "guest")
    password = os.getenv("RABBITMQ_DEFAULT_PASS", "guest")
    
    # print(f" [ ] Enviando mensaje a '{queue_name}': {message}")
    # print(f" [ ] host: {host}")
    # print(f" [ ] port: {port}")
    # print(f" [ ] user: {user}")
    # print(f" [ ] password: {password}")
    
    # Configurar credenciales
    credentials = pika.PlainCredentials(user, password)
    
    connection, channel = start_conection(credentials, host, port)

    if channel:        
        message = json.dumps(body)

        # Publicar mensaje
        channel.basic_publish(
            exchange=exchange,
            routing_key=routing_key,
            body=message,
            properties=pika.BasicProperties(
                delivery_mode=2,  # Mensajes persistentes
            )
        )     

        print(f" [✔] Mensaje enviado a '{exchange}': {message}")
        connection.close()
    else:
        print(" [ ] No se pudo establecer conexión con RabbitMQ. Abortando.")