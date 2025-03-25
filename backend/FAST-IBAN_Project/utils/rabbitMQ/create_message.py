import json

def create_message(status, message, data):
    """Crea un mensaje JSON para enviar a RabbitMQ.""" 
    return  {
        "status": status,
        "message": message,
        "data": json.dumps(data)
    }
