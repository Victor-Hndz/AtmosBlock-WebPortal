import json

def create_message(status, message, data):
    """Crea un mensaje JSON para enviar a RabbitMQ."""
    message_dict = {
        "status": status,
        "message": message,
        "data": data
    }
    
    try:
        json_message = json.dumps(message_dict)
    except TypeError as e:
        print(f"❌ Error al convertir el mensaje a JSON: {e}")
        return None
    
    return json_message