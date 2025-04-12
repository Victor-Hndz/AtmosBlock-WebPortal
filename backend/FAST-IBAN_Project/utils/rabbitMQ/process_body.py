import json
import sys

from utils.consts.consts import STATUS_OK


def process_body(body):
    """Load the arguments from the RabbitMQ queue and check the status."""

    try:
        decoded_body = json.loads(body.decode("utf-8"))
        print("ℹ️ Cuerpo del mensaje:")
        print(decoded_body)

        # Extract if comes from nestjs
        if decoded_body.get("pattern", "") == "config.create":
            decoded_body = decoded_body["data"]

        status = decoded_body.get("status", "")
        message = decoded_body.get("message", "")
        data = decoded_body.get("data", None)

        print(f"ℹ️ Estado: {status}")
        print(f"ℹ️ Mensaje: {message}")

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
