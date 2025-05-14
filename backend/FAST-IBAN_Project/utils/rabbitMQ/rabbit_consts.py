import os
from dotenv import load_dotenv

load_dotenv()

# RabbitMQ connection settings
RABBITMQ_HOST = os.getenv("RABBITMQ_HOST", "rabbitmq")
RABBITMQ_PORT = int(os.getenv("RABBITMQ_PORT", 5672))
RABBITMQ_USER = os.getenv("RABBITMQ_DEFAULT_USER", "guest")
RABBITMQ_PASSWORD = os.getenv("RABBITMQ_DEFAULT_PASS", "guest")

# Define exchanges and their types
EXCHANGES = {
    "requests": "topic",
    "execution": "topic",
    "results": "direct",
    "notifications": "direct",
}

# Define queues, their exchanges, and routing keys
QUEUES = {
    "config_queue": {
        "exchange": "requests",
        "routing_keys": ["config.create", "handler.start"]
    },
    "execution_queue": {
        "exchange": "execution",
        "routing_keys": [
            "execution.algorithm",
            "execution.visualization",
            "execution.animation",
            "execution.tracking",
        ]
    },
    "results_queue": {
        "exchange": "results", 
        "routing_keys": ["web.results"]
    },
    "notifications_queue": {
        "exchange": "notifications",
        "routing_keys": ["notify.handler"]
    },
    "message_confirmations": {
        "exchange": "",  # Default exchange for direct routing
        "routing_keys": ["message_confirmations"]
    }
}

# Max retries for connection attempts
MAX_RETRIES = 5
RETRY_DELAY = 5  # seconds
MESSAGE_TTL = 5000  # Message Time-To-Live in milliseconds
MESSAGE_PERSISTENT = 2  # Make message persistent