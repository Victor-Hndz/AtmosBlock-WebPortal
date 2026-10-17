import json
import re

def process_body(body):
    """
    Process the body of the message received from RabbitMQ.
    
    Args:
        body: Raw message body from RabbitMQ (bytes)
        
    Returns:
        The parsed content of the message

    Raises:
        ValueError: malformed JSON, or content without a valid request hash
    """
    # Decode the body from bytes to string
    body_str = body.decode('utf-8')
    
    print(f"Body: {body_str}")
    
    # JSON parser
    try:
        data = json.loads(body_str)
        print(f"Data: {data}")
        content = data.get("content", {})
        print(f"Content: {content}")
        
        # If content is a string, parse it as JSON
        if not isinstance(content, dict):
            content = json.loads(content)
    except json.JSONDecodeError as e:
        # ValueError, not SystemExit: consumers catch Exception and must survive a malformed message.
        raise ValueError(f"Error decoding JSON: {e}") from e

    # V14/WEB-302: every consumer enters here and the hash ends up in disk paths (./out/<hash>) and MinIO keys.
    # The API always generates it as a hex SHA-256.
    request_hash = content.get("request_hash", content.get("requestHash")) if isinstance(content, dict) else None
    if not isinstance(request_hash, str) or not re.fullmatch(r"[a-f0-9]{64}", request_hash):
        raise ValueError(f"Mensaje sin un hash de petición válido: {request_hash!r}")
    return content
