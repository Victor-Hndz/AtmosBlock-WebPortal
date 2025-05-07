import pika
import time


def start_conection(credentials, host, port, virtual_host="/", heartbeat=600, blocked_connection_timeout=300):
    """Establishes a connection to RabbitMQ using the provided credentials and returns (connection, channel)."""

    max_retries = 10
    attempt = 0

    while attempt < max_retries:
        try:
            parameters = pika.ConnectionParameters(
                host=host,
                port=port,
                credentials=credentials,
                virtual_host=virtual_host,
                heartbeat=heartbeat,
                blocked_connection_timeout=blocked_connection_timeout
            )

            connection = pika.BlockingConnection(parameters)
            channel = connection.channel()

            print(f" [✔] Conexión exitosa con RabbitMQ en {host}:{port}")
            return connection, channel

        except Exception as e:
            attempt += 1
            print(f" [ ] Error al conectar con RabbitMQ (Intento {attempt}/{max_retries}): {repr(e)}")
            if attempt < max_retries:
                print(" [ ] Intentando nuevamente en 5 segundos...")
                time.sleep(5)
            else:
                print(" [ ] Se alcanzó el número máximo de intentos. Abortando.")
                return None, None
