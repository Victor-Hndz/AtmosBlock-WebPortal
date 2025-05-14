import json
import logging
from typing import Dict, Any

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("message_creator")


def create_message(routing_key: str, status: str, message: str, content: Any) -> Dict[str, Any]:
    """
    Create a standardized message in format to be sent to RabbitMQ.
    
    Args:
        routing_key: Routing key for the message.
        status: Status code of the message (e.g., "OK", "ERROR")
        message: Human-readable message describing the content
        content: Payload data (will be serialized if needed)
        
    Returns:
        Dict containing the formatted message
    """
    
        
    message_body = {
        "pattern": routing_key,
        "data": {
            "status": status,
            "message": message,
            "content": content,
        }
    }
    
    logger.debug(f"Created message: {message_body}")
    return json.dumps(message_body)
