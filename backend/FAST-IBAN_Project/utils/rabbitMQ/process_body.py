import json
import sys

from utils.consts.consts import STATUS_OK

def process_body(body):
    """Carga los argumentos desde la cola de RabbitMQ y verifica el estado."""
    try:
        decoded_body = json.loads(body.decode("utf-8"))
        status = decoded_body.get("status", "")
        message = decoded_body.get("message", "")
        data = decoded_body.get("data", None)
        
        if status != STATUS_OK:
            print(f"❌ Error: {message}")
            sys.exit(1)

        if isinstance(data, (str, list, dict)):
            return data
        else:
            print("❌ Error: El campo 'data' tiene un formato no válido.")
            sys.exit(1)

    except json.JSONDecodeError as e:
        print(f"❌ Error al decodificar JSON: {e}")
        sys.exit(1)