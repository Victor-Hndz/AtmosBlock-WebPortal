import pika
import time
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("rabbitmq_connection")


def start_connection(credentials, host, port, virtual_host="/", heartbeat=600, blocked_connection_timeout=300):
    """
    Establishes a connection to RabbitMQ using the provided credentials.
    
    Args:
        credentials: RabbitMQ authentication credentials
        host: RabbitMQ server hostname
        port: RabbitMQ server port
        virtual_host: Virtual host to connect to
        heartbeat: Heartbeat interval in seconds
        blocked_connection_timeout: Timeout for blocked connections in seconds
        
    Returns:
        tuple: (connection, channel) if successful, (None, None) otherwise
    """
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
            
            # Validate the connection is open
            if not connection.is_open or not channel.is_open:
                raise pika.exceptions.AMQPConnectionError("Connection or channel not open")
                
            logger.info(f"Successfully connected to RabbitMQ at {host}:{port}")
            return connection, channel

        except Exception as e:
            attempt += 1
            logger.warning(f"Failed to connect to RabbitMQ (Attempt {attempt}/{max_retries}): {repr(e)}")
            if attempt < max_retries:
                logger.info("Retrying in 5 seconds...")
                time.sleep(5)
            else:
                logger.error("Maximum connection attempts reached. Aborting.")
                return None, None
