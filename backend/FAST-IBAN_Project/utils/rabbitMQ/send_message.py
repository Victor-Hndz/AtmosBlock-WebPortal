import pika
import os
import json
import logging
import time
from typing import Dict, Any, Optional

from dotenv import load_dotenv
from utils.rabbitMQ.start_conection import start_connection

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("rabbitmq_sender")

load_dotenv()

# Constants
MAX_RETRIES = 5
RETRY_DELAY = 5  # seconds
MESSAGE_TTL = 5000  # milliseconds (5 seconds)
MESSAGE_PERSISTENT = 2  # Delivery mode: persistent


def validate_queue_exists(channel, queue_name: str) -> bool:
    """
    Validates if a queue exists in RabbitMQ, if not waits for it.
    
    Args:
        channel: RabbitMQ channel
        queue_name: Name of the queue to validate
        
    Returns:
        bool: True if queue exists or was created, False otherwise
    """
    try:
        # Try to declare the queue passively to check if it exists
        channel.queue_declare(queue=queue_name, passive=True)
        logger.info(f"Queue '{queue_name}' exists")
        return True
    except pika.exceptions.ChannelClosedByBroker:
        logger.warning(f"Queue '{queue_name}' doesn't exist. Waiting for it to be created...")
        # Reopen channel since it was closed by the exception
        channel.connection.channel()
        
        # Wait for queue to be created (max 30 seconds)
        for _ in range(6):
            time.sleep(5)
            try:
                channel.queue_declare(queue=queue_name, passive=True)
                logger.info(f"Queue '{queue_name}' is now available")
                return True
            except:
                pass
        
        logger.error(f"Queue '{queue_name}' is not available after waiting")
        return False


def send_message(body: Dict[str, Any], exchange: str, routing_key: str, 
                 confirmation_queue: Optional[str] = "message_confirmations") -> bool:
    """
    Send a message to RabbitMQ with retry logic and reliability features.
    
    Expected message structure:
    {
        'pattern': routing_key (str),
        'data': {
            'status': STR_CODE (str),
            'message': str or "",
            'content': JSON stringify or str
        }
    }
    
    Args:
        body: Message body to send (will be JSON serialized)
        exchange: Exchange to publish to
        routing_key: Routing key for message
        confirmation_queue: Queue used for message delivery confirmations
        
    Returns:
        bool: True if message was sent successfully, False otherwise
    """
    host = os.getenv("RABBITMQ_HOST", "rabbitmq")
    port = int(os.getenv("RABBITMQ_PORT", 5672))
    user = os.getenv("RABBITMQ_DEFAULT_USER", "guest")
    password = os.getenv("RABBITMQ_DEFAULT_PASS", "guest")
    
    # Generate a unique message ID for tracking
    message_id = f"{routing_key}_{time.time()}"
    
    credentials = pika.PlainCredentials(user, password)
    
    # Ensure the message has the correct structure
    if not isinstance(body, dict):
        logger.error(f"Message body must be a dictionary, got {type(body)}")
        return False
        
    # Verify the message has the required structure
    if "pattern" not in body:
        body["pattern"] = routing_key
    
    if "data" not in body or not isinstance(body["data"], dict):
        logger.error("Message is missing 'data' field or it's not a dictionary")
        return False
        
    if "status" not in body["data"]:
        logger.error("Message data is missing 'status' field")
        return False
        
    if "content" not in body["data"]:
        logger.warning("Message data is missing 'content' field")
    
    # Try to send the message with retries
    for attempt in range(1, MAX_RETRIES + 1):
        logger.info(f"Sending message to '{exchange}.{routing_key}' (Attempt {attempt}/{MAX_RETRIES})")
        
        try:
            connection, channel = start_connection(credentials, host, port)
            
            if not channel:
                logger.error("Failed to establish connection to RabbitMQ")
                time.sleep(RETRY_DELAY)
                continue
                
            # Check if the exchange exists
            try:
                channel.exchange_declare(exchange=exchange, passive=True)
            except pika.exceptions.ChannelClosedByBroker:
                logger.error(f"Exchange '{exchange}' doesn't exist")
                connection.close()
                time.sleep(RETRY_DELAY)
                continue
            
            # Ensure confirmation queue exists for acknowledgments
            if confirmation_queue:
                channel.queue_declare(
                    queue=confirmation_queue, 
                    durable=True,
                    arguments={"x-message-ttl": 86400000}  # 24 hour TTL for confirmations
                )
            
            # Prepare the message
            try:
                message_body = json.dumps(body)
            except TypeError as e:
                logger.error(f"Failed to serialize message: {e}")
                connection.close()
                return False
            
            # Set message properties
            properties = pika.BasicProperties(
                delivery_mode=MESSAGE_PERSISTENT,  # Make message persistent
                message_id=message_id,
                expiration=str(MESSAGE_TTL),
                reply_to=confirmation_queue if confirmation_queue else None,
                headers={"attempt": attempt}
            )
            
            # Publish the message
            channel.basic_publish(
                exchange=exchange,
                routing_key=routing_key,
                body=message_body,
                properties=properties
            )
            
            logger.info(f"Message {message_id} sent successfully")
            connection.close()
            return True
            
        except Exception as e:
            logger.error(f"Error sending message: {str(e)}")
            if attempt < MAX_RETRIES:
                logger.info(f"Retrying in {RETRY_DELAY} seconds...")
                time.sleep(RETRY_DELAY)
            else:
                logger.error("Maximum sending attempts reached. Message delivery failed.")
                return False
    
    return False
