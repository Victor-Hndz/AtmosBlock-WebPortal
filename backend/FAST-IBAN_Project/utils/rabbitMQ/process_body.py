import json
import logging
from typing import Dict, Any, Optional, Union

from utils.consts.consts import STATUS_OK

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("message_processor")


def process_body(body) -> Optional[Union[str, list, dict]]:
    """
    Load and validate the message from the RabbitMQ queue.
    
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
        body: Raw message body from RabbitMQ
        
    Returns:
        Processed message content or None if processing failed
    
    Raises:
        SystemExit: If the message has an error status or invalid format
    """
    try:
        # Decode the message body if it's bytes
        if isinstance(body, bytes):
            decoded_body = json.loads(body.decode("utf-8"))
        elif isinstance(body, str):
            decoded_body = json.loads(body)
        else:
            decoded_body = body
            
        logger.info("Message received:")
        logger.info(decoded_body)

        # Extract pattern and data from the message
        pattern = decoded_body.get("pattern", "")
        data = decoded_body.get("data", {})
        
        logger.info(f"Pattern: {pattern}")
        
        # Check if data is properly structured
        if not isinstance(data, dict):
            logger.error(f"Invalid data format: {type(data)}")
            return None
            
        # Extract message components from data
        status = data.get("status", "")
        message = data.get("message", "")
        content = data.get("content", None)

        logger.info(f"Status: {status}")
        logger.info(f"Message: {message}")

        # Check message status
        if status != STATUS_OK:
            logger.error(f"Error in message: {message}")
            return None

        # Validate content
        if content is None:
            logger.warning("Message contains no content")
            return {}
            
        # If content is JSON string, parse it
        if isinstance(content, str):
            try:
                content = json.loads(content)
            except json.JSONDecodeError:
                # If not valid JSON, keep as string
                pass
                
        # Validate content type
        if isinstance(content, (str, list, dict)):
            return content
        else:
            logger.error(f"Invalid content format: {type(content)}")
            return None

    except json.JSONDecodeError as e:
        logger.error(f"Failed to decode JSON: {str(e)}")
        return None
    except Exception as e:
        logger.error(f"Unexpected error processing message: {str(e)}")
        return None
