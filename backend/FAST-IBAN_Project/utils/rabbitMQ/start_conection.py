import pika
import time

def start_conection(credentials, host, port):
    """ Establece una conexión con RabbitMQ usando credenciales """
    
    # Intentos de conexión con reintentos
    connection = None
    channel = None
    max_retries = 10  # Número máximo de intentos
    attempt = 0
    
    while attempt < max_retries:
        # Configurar credenciales
        try:
            # Intentar establecer conexión
            connection = pika.BlockingConnection(pika.ConnectionParameters(host=host, port=port, credentials=credentials))
            channel = connection.channel()
            
            # Si la conexión es exitosa, salimos del ciclo
            print(f" [✔] Conexión exitosa con RabbitMQ en {host}:{port}")
            break
        except Exception as e:
            attempt += 1
            print(f" [ ] Error al conectar con RabbitMQ (Intento {attempt}/{max_retries}): {repr(e)}")
            if attempt < max_retries:
                print(" [ ] Intentando nuevamente en 5 segundos...")
                time.sleep(5)
            else:
                print(" [ ] Se alcanzó el número máximo de intentos. Abortando.")
                return

    print(" [ ] Conexión establecida con RabbitMQ")
    return connection, channel