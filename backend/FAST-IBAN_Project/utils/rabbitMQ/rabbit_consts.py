import os
from dotenv import load_dotenv

load_dotenv()

# RabbitMQ connection settings
RABBITMQ_HOST = os.getenv("RABBITMQ_HOST", "rabbitmq")
RABBITMQ_PORT = int(os.getenv("RABBITMQ_PORT", 5672))
RABBITMQ_USER = os.getenv("RABBITMQ_DEFAULT_USER", "guest")
RABBITMQ_PASSWORD = os.getenv("RABBITMQ_DEFAULT_PASS", "guest")

# Exchange names
REQUESTS_EXCHANGE = "requests_exchange"
EXECUTION_EXCHANGE = "execution_exchange"
NOTIFICATIONS_EXCHANGE = "notifications_exchange"
RESULTS_EXCHANGE = "results_exchange"

# Exchanges definition (durable topic/direct exchanges)
EXCHANGES = {
    REQUESTS_EXCHANGE: {
        "type": "topic",
        "durable": True
    },
    EXECUTION_EXCHANGE: {
        "type": "topic",
        "durable": True
    },
    NOTIFICATIONS_EXCHANGE: {
        "type": "direct",
        "durable": True
    },
    RESULTS_EXCHANGE: {
        "type": "direct",
        "durable": True
    }
}

# Queue names
CONFIG_QUEUE = "config_queue"
HANDLER_QUEUE = "handler_queue"
EXECUTION_ALGORITHM_QUEUE = "execution_algorithm_queue"
EXECUTION_VISUALIZATION_QUEUE = "execution_visualization_queue"
EXECUTION_ANIMATION_QUEUE = "execution_animation_queue"
EXECUTION_TRACKING_QUEUE = "execution_tracking_queue"
NOTIFICATIONS_QUEUE = "notifications_queue"
RESULTS_QUEUE = "results_queue"

# Routing keys
CONFIG_CREATE_KEY = "config.create"
HANDLER_START_KEY = "handler.start"
EXECUTION_ALGORITHM_KEY = "execution.algorithm"
EXECUTION_VISUALIZATION_KEY = "execution.visualization"
EXECUTION_ANIMATION_KEY = "execution.animation"
EXECUTION_TRACKING_KEY = "execution.tracking"
NOTIFY_HANDLER_KEY = "notify.handler"
RESULTS_DONE_KEY = "results.done"

# Each queue is bound to a single exchange and one routing key
QUEUES = {
    # Requests
    CONFIG_QUEUE: {
        "exchange": REQUESTS_EXCHANGE,
        "routing_key": CONFIG_CREATE_KEY
    },
    HANDLER_QUEUE: {
        "exchange": REQUESTS_EXCHANGE,
        "routing_key": HANDLER_START_KEY
    },

    # Execution
    EXECUTION_ALGORITHM_QUEUE: {
        "exchange": EXECUTION_EXCHANGE,
        "routing_key": EXECUTION_ALGORITHM_KEY
    },
    EXECUTION_VISUALIZATION_QUEUE: {
        "exchange": EXECUTION_EXCHANGE,
        "routing_key": EXECUTION_VISUALIZATION_KEY
    },
    EXECUTION_ANIMATION_QUEUE: {
        "exchange": EXECUTION_EXCHANGE,
        "routing_key": EXECUTION_ANIMATION_KEY
    },
    EXECUTION_TRACKING_QUEUE: {
        "exchange": EXECUTION_EXCHANGE,
        "routing_key": EXECUTION_TRACKING_KEY
    },
    
    # Notifications
    NOTIFICATIONS_QUEUE: {
        "exchange": NOTIFICATIONS_EXCHANGE,
        "routing_key": NOTIFY_HANDLER_KEY
    },

    # Results
    RESULTS_QUEUE: {
        "exchange": RESULTS_EXCHANGE,
        "routing_key": RESULTS_DONE_KEY
    },
}

# Message and connection settings
MESSAGE_TTL = 5000  # in milliseconds
MESSAGE_PERSISTENT = 2  # DeliveryMode: 2 = persistent
MAX_RETRIES = 5
RETRY_DELAY = 5  # in seconds
