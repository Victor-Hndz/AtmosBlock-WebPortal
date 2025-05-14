import pika
import logging
import time
from typing import Dict, List, Optional, Tuple
from utils.rabbitMQ.start_conection import start_connection
from utils.rabbitMQ.rabbit_consts import RABBITMQ_HOST, RABBITMQ_PORT, RABBITMQ_USER, RABBITMQ_PASSWORD, EXCHANGES, QUEUES, MAX_RETRIES, RETRY_DELAY


# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("rabbitmq_init")


def wait_for_rabbitmq() -> Tuple[Optional[pika.BlockingConnection], Optional[pika.channel.Channel]]:
    """
    Attempt to connect to RabbitMQ with retries.
    
    Returns:
        tuple: (connection, channel) if successful, (None, None) otherwise
    """
    attempt = 0
    
    while attempt < MAX_RETRIES:
        try:
            logger.info(f"Attempting to connect to RabbitMQ ({attempt+1}/{MAX_RETRIES})...")
            credentials = pika.PlainCredentials(RABBITMQ_USER, RABBITMQ_PASSWORD)
            connection, channel = start_connection(credentials, RABBITMQ_HOST, RABBITMQ_PORT)
            
            if channel:
                logger.info("Successfully connected to RabbitMQ")
                return connection, channel
            
            attempt += 1
            logger.warning(f"Failed to connect to RabbitMQ. Retrying in {RETRY_DELAY} seconds...")
            time.sleep(RETRY_DELAY)
            
        except Exception as e:
            attempt += 1
            logger.error(f"Error connecting to RabbitMQ: {str(e)}")
            if attempt < MAX_RETRIES:
                logger.info(f"Retrying in {RETRY_DELAY} seconds...")
                time.sleep(RETRY_DELAY)
            else:
                logger.error("Maximum connection attempts reached")
                return None, None
    
    return None, None


def setup_exchange(channel: pika.channel.Channel, exchange: str, exchange_config: Dict) -> bool:
    """
    Create an exchange with the specified type.
    
    Args:
        channel: RabbitMQ channel
        exchange: Exchange name
        exchange_config: Exchange configuration including type and durability
        
    Returns:
        bool: True if successful, False otherwise
    """
    try:
        exchange_type = exchange_config["type"]
        durable = exchange_config.get("durable", True)
        
        channel.exchange_declare(
            exchange=exchange, 
            exchange_type=exchange_type, 
            durable=durable
        )
        logger.info(f"Exchange '{exchange}' created ({exchange_type})")
        return True
    except Exception as e:
        logger.error(f"Failed to create exchange '{exchange}': {str(e)}")
        return False


def setup_queue(
    channel: pika.channel.Channel, 
    queue_name: str, 
    exchange: str, 
    routing_key: str,
    arguments: Dict = None
) -> bool:
    """
    Create a queue and bind it to an exchange with a routing key.
    
    Args:
        channel: RabbitMQ channel
        queue_name: Name of the queue
        exchange: Exchange to bind to
        routing_key: Routing key for this queue
        arguments: Optional queue arguments
        
    Returns:
        bool: True if successful, False otherwise
    """
    try:
        # Declare queue with arguments if provided
        channel.queue_declare(
            queue=queue_name, 
            durable=True,
            arguments=arguments
        )
        
        # Bind to the routing key
        if exchange:  # Only bind if exchange is specified
            channel.queue_bind(
                exchange=exchange, 
                queue=queue_name, 
                routing_key=routing_key
            )
            logger.info(f"Queue '{queue_name}' bound to '{exchange}' with routing key '{routing_key}'")
        else:
            logger.info(f"Queue '{queue_name}' created (no exchange binding)")
                
        return True
    except Exception as e:
        logger.error(f"Failed to setup queue '{queue_name}': {str(e)}")
        return False


def init_rabbitmq() -> Tuple[bool, Optional[pika.BlockingConnection], Optional[pika.channel.Channel]]:
    """
    Initialize exchanges and queues in RabbitMQ.
    
    Returns:
        tuple: (success, connection, channel)
            - success: True if initialization was successful, False otherwise
            - connection: The RabbitMQ connection if successful, None otherwise
            - channel: The RabbitMQ channel if successful, None otherwise
    """
    logger.info("Initializing RabbitMQ...")
    
    # Wait for RabbitMQ to be available
    connection, channel = wait_for_rabbitmq()
    
    if not channel:
        logger.error("Failed to establish connection to RabbitMQ. Aborting.")
        return False, None, None

    # Set up exchanges
    for exchange_name, exchange_config in EXCHANGES.items():
        if not setup_exchange(channel, exchange_name, exchange_config):
            connection.close()
            return False, None, None

    # Set up queues
    for queue_name, queue_config in QUEUES.items():
        exchange_name = queue_config.get("exchange", "")
        routing_key = queue_config.get("routing_key", "")
        arguments = queue_config.get("arguments", None)
        
        if not setup_queue(
            channel, 
            queue_name, 
            exchange_name, 
            routing_key,
            arguments
        ):
            connection.close()
            return False, None, None

    logger.info("RabbitMQ initialization completed successfully.")
    return True, connection, channel


def launch_rabbitmq_init() -> Tuple[Optional[pika.BlockingConnection], Optional[pika.channel.Channel]]:
    """
    Initialize RabbitMQ exchanges and queues, and return the connection and channel.
    
    Returns:
        tuple: (connection, channel) if successful
        
    Raises:
        SystemExit: If initialization fails
    """
    success, connection, channel = init_rabbitmq()
    if success:
        logger.info("RabbitMQ queues and exchanges have been initialized successfully.")
        return connection, channel
    else:
        logger.error("Failed to initialize RabbitMQ queues and exchanges.")
        exit(1)