import pika
import os
import json
from dotenv import load_dotenv
from utils.rabbitMQ.start_conection import start_conection

load_dotenv()


def receive_messages(queue_name, routing_key, callback):
    """Keep listening to RabbitMQ and executes the callback every time it receives a message."""

    host = os.getenv("RABBITMQ_HOST", "rabbitmq")
    port = os.getenv("RABBITMQ_PORT", 5672)
    user = os.getenv("RABBITMQ_DEFAULT_USER", "guest")
    password = os.getenv("RABBITMQ_DEFAULT_PASS", "guest")

    credentials = pika.PlainCredentials(user, password)
    connection, channel = start_conection(credentials, host, port)

    if channel:
        print(f"[*] Escuchando mensajes en '{queue_name}'. Presiona CTRL+C para salir.")

        def on_message(ch, method, properties, body):
            body_dict = json.loads(body)

            # if str, transformed to dict
            if isinstance(body_dict, dict):
                body_pattern = body_dict.get("pattern", None)
            else:
                body_pattern = body_dict
            # print(f"body pattern: {body_pattern}")
            print(f"method.routing key: {method.routing_key}")
            print(f"routing key: {routing_key}")
            print(f"body_pattern: {body_pattern}")
            if method.routing_key in routing_key or (body_pattern and any(body_pattern in rk for rk in routing_key)):
                print(f"\n✅ Mensaje recibido en '{queue_name}': {body}")
                callback(body)  # Llamar a la función del usuario
                ch.basic_ack(delivery_tag=method.delivery_tag)  # Confirmar recepción
            else:
                print(f"\n[ ] Mensaje descartado: {body}")
                ch.basic_nack(delivery_tag=method.delivery_tag)  # Rechazar mensaje

        channel.basic_consume(queue=queue_name, on_message_callback=on_message)

        try:
            channel.start_consuming()
        except KeyboardInterrupt:
            print("\n[ ] Se detuvo la escucha de mensajes.")
            connection.close()
    else:
        print("\n[ ] No se pudo establecer conexión con RabbitMQ. Abortando.")
