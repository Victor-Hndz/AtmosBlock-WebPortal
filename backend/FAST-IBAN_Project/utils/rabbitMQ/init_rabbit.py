import pika
import os
import logging
import time
from typing import Dict, List, Optional, Tuple
from dotenv import load_dotenv
from utils.rabbitMQ.start_conection import start_connection


# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("rabbitmq_init")

load_dotenv()

# RabbitMQ connection settings
RABBITMQ_HOST = os.getenv("RABBITMQ_HOST", "rabbitmq")
RABBITMQ_PORT = int(os.getenv("RABBITMQ_PORT", 5672))
RABBITMQ_USER = os.getenv("RABBITMQ_DEFAULT_USER", "guest")
RABBITMQ_PASSWORD = os.getenv("RABBITMQ_DEFAULT_PASS", "guest")

# Define exchanges and their types
EXCHANGES = {
    "requests": "topic",
    "execution": "topic",
    "results": "direct",
    "notifications": "direct",
}

# Define queues, their exchanges, and routing keys
QUEUES = {
    "config_queue": {
        "exchange": "requests",
        "routing_keys": ["config.create", "handler.start"]
    },
    "execution_queue": {
        "exchange": "execution",
        "routing_keys": [
            "execution.algorithm",
            "execution.visualization",
            "execution.animation",
            "execution.tracking",
        ]
    },
    "results_queue": {
        "exchange": "results", 
        "routing_keys": ["web.results"]
    },
    "notifications_queue": {
        "exchange": "notifications",
        "routing_keys": ["notify.handler"]
    },
    "message_confirmations": {
        "exchange": "",  # Default exchange for direct routing
        "routing_keys": ["message_confirmations"]
    }
}

# Max retries for connection attempts
MAX_RETRIES = 5
RETRY_DELAY = 5  # seconds


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


def setup_exchange(channel: pika.channel.Channel, exchange: str, exchange_type: str) -> bool:
    """
    Create an exchange with the specified type.
    
    Args:
        channel: RabbitMQ channel
        exchange: Exchange name
        exchange_type: Type of exchange (direct, topic, fanout, etc.)
        
    Returns:
        bool: True if successful, False otherwise
    """
    try:
        channel.exchange_declare(
            exchange=exchange, 
            exchange_type=exchange_type, 
            durable=True
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
    routing_keys: List[str],
    arguments: Dict = None
) -> bool:
    """
    Create a queue and bind it to an exchange with routing keys.
    
    Args:
        channel: RabbitMQ channel
        queue_name: Name of the queue
        exchange: Exchange to bind to
        routing_keys: List of routing keys for this queue
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
        
        # Bind to each routing key
        for routing_key in routing_keys:
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


def init_rabbitmq() -> bool:
    """
    Initialize exchanges and queues in RabbitMQ.
    
    Returns:
        bool: True if initialization was successful, False otherwise
    """
    logger.info("Initializing RabbitMQ...")
    
    # Wait for RabbitMQ to be available
    connection, channel = wait_for_rabbitmq()
    
    if not channel:
        logger.error("Failed to establish connection to RabbitMQ. Aborting.")
        return False

    # Set up exchanges
    for exchange, exchange_type in EXCHANGES.items():
        if not setup_exchange(channel, exchange, exchange_type):
            connection.close()
            return False

    # Set up queues
    for queue, config in QUEUES.items():
        if not setup_queue(
            channel, 
            queue, 
            config["exchange"], 
            config["routing_keys"],
            config.get("arguments")
        ):
            connection.close()
            return False

    # Close connection when done
    connection.close()
    logger.info("RabbitMQ initialization completed successfully.")
    return True


# Allow running this module directly to initialize RabbitMQ
if __name__ == "__main__":
    success = init_rabbitmq()
    if success:
        logger.info("RabbitMQ queues and exchanges have been initialized successfully.")
    else:
        logger.error("Failed to initialize RabbitMQ queues and exchanges.")
        exit(1)
