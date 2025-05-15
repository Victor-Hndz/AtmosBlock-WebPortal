import json

def process_body(body):
    """
    Process the body of the message received from RabbitMQ.
    
    Args:
        body: Raw message body from RabbitMQ (bytes)
        
    Returns:
        The parsed content of the message
    """
    # Decode the body from bytes to string
    body_str = body.decode('utf-8')
    
    print(f"Body: {body_str}")
    
    # JSON parser
    try:
        data = json.loads(body_str)
        print(f"Data: {data}")
        content = data.get("data", {}).get("content", {})
        print(f"Content: {content}")
        
        # If content is already a dictionary, return it directly
        # If it's a string, parse it as JSON
        if isinstance(content, dict):
            return content
        else:
            return json.loads(content)
    except json.JSONDecodeError as e:
        raise SystemExit(f"Error decoding JSON: {e}")
