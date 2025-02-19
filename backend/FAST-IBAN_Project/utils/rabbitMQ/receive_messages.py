import pika
import os
import json
from dotenv import load_dotenv
from utils.rabbitMQ.start_conection import start_conection

# Cargar variables desde .env
load_dotenv()

def receive_messages(queue_name, routing_key, callback):
    """ Mantiene la escucha en RabbitMQ y ejecuta el callback cada vez que recibe un mensaje """

    # Obtener credenciales desde .env
    host = os.getenv("RABBITMQ_HOST", "rabbitmq")
    port = os.getenv("RABBITMQ_PORT", 5672)
    user = os.getenv("RABBITMQ_DEFAULT_USER", "guest")
    password = os.getenv("RABBITMQ_DEFAULT_PASS", "guest")

    # Configurar credenciales
    credentials = pika.PlainCredentials(user, password)
    connection, channel = start_conection(credentials, host, port)

    if channel:
        print(f"[*] Escuchando mensajes en '{queue_name}'. Presiona CTRL+C para salir.")

        # Callback para recibir mensajes de forma continua
        def on_message(ch, method, properties, body):
            body_dict = json.loads(body)
            #si es str, lo convierte a dict
            if isinstance(body_dict, dict):
                body_pattern = body_dict.get("pattern", None)
            else:
                body_pattern = body_dict
            # print(f"body pattern: {body_pattern}")
            if (method.routing_key in routing_key or body_pattern in routing_key):
                # print(f"\n✅ Mensaje recibido en '{queue_name}': {body}")
                callback(body)  # Llamar a la función del usuario
                ch.basic_ack(delivery_tag=method.delivery_tag)  # Confirmar recepción
            else:
                # print(f"\n[ ] Mensaje descartado: {body}")
                ch.basic_nack(delivery_tag=method.delivery_tag)  # Rechazar mensaje

        # Consumir mensajes continuamente
        channel.basic_consume(queue=queue_name, on_message_callback=on_message)

        try:
            channel.start_consuming()
        except KeyboardInterrupt:
            print("\n[ ] Se detuvo la escucha de mensajes.")
            connection.close()
    else:
        print("\n[ ] No se pudo establecer conexión con RabbitMQ. Abortando.")
