import pika
import os
import json

from dotenv import load_dotenv
from utils.rabbitMQ.start_conection import start_conection

load_dotenv()


def send_message(body, exchange, routing_key):
    """Send a message to RabbitMQ using credentials from .env file."""

    host = os.getenv("RABBITMQ_HOST", "rabbitmq")
    port = os.getenv("RABBITMQ_PORT", 5672)
    user = os.getenv("RABBITMQ_DEFAULT_USER", "guest")
    password = os.getenv("RABBITMQ_DEFAULT_PASS", "guest")

    credentials = pika.PlainCredentials(user, password)

    connection, channel = start_conection(credentials, host, port)

    if channel:
        message = json.dumps(body)

        channel.basic_publish(
            exchange=exchange,
            routing_key=routing_key,
            body=message,
            properties=pika.BasicProperties(
                delivery_mode=2,
                expiration="5000",  # 5 seconds
            ),
        )

        # print(f"\n✅ Mensaje enviado a '{exchange}': {message}")
        connection.close()
    else:
        print("\n[ ] No se pudo establecer conexión con RabbitMQ. Abortando.")
