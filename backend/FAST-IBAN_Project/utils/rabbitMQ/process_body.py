import json

def process_body(body):
    """
    Process the body of the message received from RabbitMQ.
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
        return json.loads(content)
    except json.JSONDecodeError as e:
        raise SystemExit(f"Error decoding JSON: {e}")
