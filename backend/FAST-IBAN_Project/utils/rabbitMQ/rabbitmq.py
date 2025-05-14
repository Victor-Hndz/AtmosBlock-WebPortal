import pika
import json
import logging
from utils.rabbitMQ.init_rabbit import launch_rabbitmq_init
from utils.rabbitMQ.rabbit_consts import MESSAGE_TTL, MESSAGE_PERSISTENT

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("rabbitmq")

class RabbitMQ:
    def __init__(self):
        self.connection, self.channel = launch_rabbitmq_init()

    def close(self):
        if self.connection and not self.connection.is_closed:
            self.connection.close()
            
    def _callback_wrapper(self, callback):
        """
        Create a wrapper for the callback function that extracts the body and passes it to the user callback.
        
        Args:
            callback: User-provided callback function that processes just the message body
            
        Returns:
            Function that can be used as a pika callback
        """
        def wrapper(ch, method, properties, body):
            try:
                logger.info(f"Received message on {method.routing_key}")
                logger.debug(f"Message properties: {properties}")
                logger.debug(f"Message body: {body}")
                # Call the provided callback with just the body
                callback(body)
                
            except Exception as e:
                logger.error(f"Error processing message: {str(e)}")
            
        return wrapper

    def consume(self, queue_name, callback):
        """
        Start consuming messages from the specified queue.
        
        Args:
            queue_name: Name of the queue to consume from
            callback: Function that takes a message body as its parameter
        """
        if not self.channel:
            raise Exception("Connection is not established.")
            
        # Wrap the user callback to handle pika's callback interface
        wrapped_callback = self._callback_wrapper(callback)
        
        self.channel.basic_consume(
            queue=queue_name, 
            on_message_callback=wrapped_callback, 
            auto_ack=True
        )
        
        logger.info(f"Started consuming from queue: {queue_name}")
        self.channel.start_consuming()

    def publish(self, exchange, routing_key, message):
        """
        Publish a message to the specified exchange with the given routing key.
        
        Args:
            exchange: Exchange name
            routing_key: Routing key
            message: Message to publish (will be serialized to JSON if not already a string)
        """
        if not self.channel:
            raise Exception("Connection is not established.")
            
        # If message is not a string, convert it to JSON
        if not isinstance(message, str):
            message = json.dumps(message)
            
        self.channel.basic_publish(
            exchange=exchange,
            routing_key=routing_key,
            body=message,
            properties=pika.BasicProperties(
                delivery_mode=MESSAGE_PERSISTENT,  # Make message persistent
                expiration=str(MESSAGE_TTL),
            )
        )
        logger.info(f"Published message to exchange '{exchange}' with routing key '{routing_key}'")