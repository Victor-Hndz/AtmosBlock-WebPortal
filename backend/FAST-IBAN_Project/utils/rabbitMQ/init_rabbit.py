import pika
import os
from dotenv import load_dotenv
from utils.rabbitMQ.start_conection import start_conection

# Cargar variables desde .env
load_dotenv()

# Parámetros de conexión desde .env
RABBITMQ_HOST = os.getenv("RABBITMQ_HOST", "rabbitmq")
RABBITMQ_PORT = int(os.getenv("RABBITMQ_PORT", 5672))
RABBITMQ_USER = os.getenv("RABBITMQ_DEFAULT_USER", "guest")
RABBITMQ_PASSWORD = os.getenv("RABBITMQ_DEFAULT_PASS", "guest")

# Exchanges y colas a inicializar
EXCHANGES = { 
    "requests": "topic",
    "execution": "topic",
    "results": "direct",
    "notifications": "direct"
}

QUEUES = {
    "config_queue": {
        "exchange": "requests", 
        "routing_keys": ["config.create", "handler.start"]
    },
    "execution_queue": {
        "exchange": "execution", 
        "routing_keys": ["execution.algorithm", "execution.visualization", "execution.animation", "execution.tracking"]
    },
    "results_queue": {"exchange": "results", "routing_keys": ["web.results"]},
    "notifications_queue": {"exchange": "notifications", "routing_keys": ["notify.handler"]}
}


def init_rabbitmq():
    """ Inicializa exchanges y colas en RabbitMQ """

    print(" [*] Conectando a RabbitMQ...")

    # Configurar credenciales
    credentials = pika.PlainCredentials(RABBITMQ_USER, RABBITMQ_PASSWORD)
    connection, channel = start_conection(credentials, RABBITMQ_HOST, RABBITMQ_PORT)

    if not channel:
        print(" [!] No se pudo establecer conexión con RabbitMQ. Abortando.")
        return
    
    print(" [✔] Conectado a RabbitMQ.")

    # Crear exchanges
    for exchange, exchange_type in EXCHANGES.items():
        channel.exchange_declare(exchange=exchange, exchange_type=exchange_type, durable=True)
        print(f" [✔] Exchange '{exchange}' creado ({exchange_type})")

    # Crear colas y vincularlas
    for queue, config in QUEUES.items():
        channel.queue_declare(queue=queue, durable=True)  # Cola persistente
        for routing_key in config["routing_keys"]:
            channel.queue_bind(exchange=config["exchange"], queue=queue, routing_key=routing_key)
            print(f" [✔] Cola '{queue}' vinculada a '{config['exchange']}' con routing_key '{routing_key}'")
    connection.close()
    print(" [✔] Configuración de RabbitMQ completada.")