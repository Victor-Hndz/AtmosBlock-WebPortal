import aio_pika
import logging
import asyncio
from typing import Dict, Optional, Tuple
from utils.rabbitMQ.start_conection import start_connection
from utils.rabbitMQ.rabbit_consts import RABBITMQ_HOST, RABBITMQ_PORT, RABBITMQ_USER, RABBITMQ_PASSWORD, EXCHANGES, QUEUES, MAX_RETRIES, RETRY_DELAY


# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("rabbitmq_init")


async def wait_for_rabbitmq() -> Tuple[Optional[aio_pika.Connection], Optional[aio_pika.Channel]]:
    """
    Attempt to connect to RabbitMQ with retries asynchronously.
    
    Returns:
        tuple: (connection, channel) if successful, (None, None) otherwise
    """
    attempt = 0
    
    while attempt < MAX_RETRIES:
        try:
            logger.info(f"Attempting to connect to RabbitMQ ({attempt+1}/{MAX_RETRIES})...")
            connection, channel = await start_connection(
                RABBITMQ_USER, RABBITMQ_PASSWORD, RABBITMQ_HOST, RABBITMQ_PORT
            )
            
            if channel:
                logger.info("Successfully connected to RabbitMQ")
                return connection, channel
            
            attempt += 1
            logger.warning(f"Failed to connect to RabbitMQ. Retrying in {RETRY_DELAY} seconds...")
            await asyncio.sleep(RETRY_DELAY)
            
        except Exception as e:
            attempt += 1
            logger.error(f"Error connecting to RabbitMQ: {str(e)}")
            if attempt < MAX_RETRIES:
                logger.info(f"Retrying in {RETRY_DELAY} seconds...")
                await asyncio.sleep(RETRY_DELAY)
            else:
                logger.error("Maximum connection attempts reached")
                return None, None
    
    return None, None


async def setup_exchange(channel: aio_pika.Channel, exchange: str, exchange_config: Dict) -> bool:
    """
    Create an exchange with the specified type asynchronously.
    
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
        
        await channel.declare_exchange(
            name=exchange, 
            type=exchange_type, 
            durable=durable
        )
        logger.info(f"Exchange '{exchange}' created ({exchange_type})")
        return True
    except Exception as e:
        logger.error(f"Failed to create exchange '{exchange}': {str(e)}")
        return False


async def setup_queue(
    channel: aio_pika.Channel, 
    queue_name: str, 
    exchange: str, 
    routing_key: str,
    arguments: Dict = None
) -> bool:
    """
    Create a queue and bind it to an exchange with a routing key asynchronously.
    
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
        queue = await channel.declare_queue(
            name=queue_name, 
            durable=True,
            arguments=arguments
        )
        
        # Bind to the routing key
        if exchange:  # Only bind if exchange is specified
            exchange_obj = await channel.get_exchange(exchange)
            await queue.bind(
                exchange=exchange_obj, 
                routing_key=routing_key
            )
            logger.info(f"Queue '{queue_name}' bound to '{exchange}' with routing key '{routing_key}'")
        else:
            logger.info(f"Queue '{queue_name}' created (no exchange binding)")
                
        return True
    except Exception as e:
        logger.error(f"Failed to setup queue '{queue_name}': {str(e)}")
        return False


async def init_rabbitmq() -> Tuple[bool, Optional[aio_pika.Connection], Optional[aio_pika.Channel]]:
    """
    Initialize exchanges and queues in RabbitMQ asynchronously.
    
    Returns:
        tuple: (success, connection, channel)
            - success: True if initialization was successful, False otherwise
            - connection: The RabbitMQ connection if successful, None otherwise
            - channel: The RabbitMQ channel if successful, None otherwise
    """
    logger.info("Initializing RabbitMQ...")
    
    # Wait for RabbitMQ to be available
    connection, channel = await wait_for_rabbitmq()
    
    if not channel:
        logger.error("Failed to establish connection to RabbitMQ. Aborting.")
        return False, None, None

    # Set up exchanges
    for exchange_name, exchange_config in EXCHANGES.items():
        if not await setup_exchange(channel, exchange_name, exchange_config):
            await connection.close()
            return False, None, None

    # Set up queues
    for queue_name, queue_config in QUEUES.items():
        exchange_name = queue_config.get("exchange", "")
        routing_key = queue_config.get("routing_key", "")
        arguments = queue_config.get("arguments", None)
        
        if not await setup_queue(
            channel, 
            queue_name, 
            exchange_name, 
            routing_key,
            arguments
        ):
            await connection.close()
            return False, None, None

    logger.info("RabbitMQ initialization completed successfully.")
    return True, connection, channel


async def launch_rabbitmq_init() -> Tuple[Optional[aio_pika.Connection], Optional[aio_pika.Channel]]:
    """
    Initialize RabbitMQ exchanges and queues, and return the connection and channel asynchronously.
    
    Returns:
        tuple: (connection, channel) if successful
        
    Raises:
        SystemExit: If initialization fails
    """
    success, connection, channel = await init_rabbitmq()
    if success:
        logger.info("RabbitMQ queues and exchanges have been initialized successfully.")
        return connection, channel
    else:
        logger.error("Failed to initialize RabbitMQ queues and exchanges.")
        exit(1)