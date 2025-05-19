import aio_pika
import logging
import asyncio
from typing import Tuple, Optional

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("rabbitmq_connection")


async def start_connection(
    login: str, 
    password: str, 
    host: str, 
    port: int, 
    virtual_host: str = "/", 
    heartbeat: int = 600, 
    blocked_connection_timeout: int = 300
) -> Tuple[Optional[aio_pika.Connection], Optional[aio_pika.Channel]]:
    """
    Establishes an asynchronous connection to RabbitMQ.
    
    Args:
        login: RabbitMQ username
        password: RabbitMQ password
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
            connection_string = f"amqp://{login}:{password}@{host}:{port}/{virtual_host}"
            connection = await aio_pika.connect_robust(
                connection_string,
                heartbeat=heartbeat,
                timeout=blocked_connection_timeout
            )
            
            channel = await connection.channel()
            
            # Validate the connection is open
            if connection.is_closed or channel.is_closed:
                raise aio_pika.exceptions.AMQPError("Connection or channel not open")
                
            logger.info(f"Successfully connected to RabbitMQ at {host}:{port}")
            return connection, channel

        except Exception as e:
            attempt += 1
            logger.warning(f"Failed to connect to RabbitMQ (Attempt {attempt}/{max_retries}): {repr(e)}")
            if attempt < max_retries:
                logger.info("Retrying in 5 seconds...")
                await asyncio.sleep(5)
            else:
                logger.error("Maximum connection attempts reached. Aborting.")
                return None, None
