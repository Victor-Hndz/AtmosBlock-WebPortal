import json


def create_message(status: str, message: str, data: str | dict) -> dict:
    """Create a message in JSON format to be sent to RabbitMQ."""

    return {"status": status, "message": message, "data": json.dumps(data)}
