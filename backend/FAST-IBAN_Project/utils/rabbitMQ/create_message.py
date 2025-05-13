import json
import uuid
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
    
    # Convert content to JSON string if it's a dict or list
    if isinstance(content, (dict, list)):
        try:
            content_str = json.dumps(content)
        except TypeError as e:
            logger.warning(f"Could not serialize content to JSON: {e}")
            content_str = str(content)
    else:
        content_str = content
        
    message_body = {
        "pattern": routing_key,
        "data": {
            "status": status,
            "message": message,
            "content": content_str,
        }
    }
    
    logger.debug(f"Created message: {message_body}")
    return message_body
