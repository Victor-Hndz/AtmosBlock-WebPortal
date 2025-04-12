import pika
import time


def start_conection(credentials, host, port):
    """Establishes a connection to RabbitMQ using the provided credentials."""

    connection = None
    channel = None
    max_retries = 10
    attempt = 0

    while attempt < max_retries:
        try:
            connection = pika.BlockingConnection(
                pika.ConnectionParameters(host=host, port=port, credentials=credentials)
            )
            channel = connection.channel()

            print(f" [✔] Conexión exitosa con RabbitMQ en {host}:{port}")
            break
        except Exception as e:
            attempt += 1
            print(
                f" [ ] Error al conectar con RabbitMQ (Intento {attempt}/{max_retries}): {repr(e)}"
            )
            if attempt < max_retries:
                print(" [ ] Intentando nuevamente en 5 segundos...")
                time.sleep(5)
            else:
                print(" [ ] Se alcanzó el número máximo de intentos. Abortando.")
                return

    print(" [ ] Conexión establecida con RabbitMQ")
    return connection, channel
