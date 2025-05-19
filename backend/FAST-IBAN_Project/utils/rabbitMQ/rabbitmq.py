import json
import logging
import asyncio
import aio_pika
from typing import Callable, Any
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
        self.connection = None
        self.channel = None
        self.consumer_tasks = []
        
    async def initialize(self):
        """Initialize the RabbitMQ connection and channel asynchronously"""
        self.connection, self.channel = await launch_rabbitmq_init()
        return self.connection is not None and self.channel is not None

    async def close(self):
        """Close the RabbitMQ connection asynchronously"""
        if self.connection and not self.connection.is_closed:
            await self.connection.close()
            logger.info("RabbitMQ connection closed")
            
    async def _callback_wrapper(self, message: aio_pika.IncomingMessage, callback: Callable):
        """
        Create a wrapper for the callback function that extracts the body and passes it to the user callback.
        
        Args:
            message: aio-pika message object
            callback: User-provided callback function that processes the message body
        """
        async with message.process():
            try:
                body = message.body
                if asyncio.iscoroutinefunction(callback):
                    await callback(body)
                else:
                    callback(body)
            except Exception as e:
                logger.error(f"Error processing message: {str(e)}")
                # Message is automatically rejected if an exception occurs

    async def consume(self, queue_name: str, callback: Callable[[bytes], Any], prefetch_count: int = 10):
        """
        Start consuming messages from the specified queue asynchronously.
        
        Args:
            queue_name: Name of the queue to consume from
            callback: Function or coroutine that takes a message body as its parameter
            prefetch_count: Number of messages to prefetch
        """
        if not self.channel:
            raise Exception("Connection is not established.")
        
        # Set QoS
        await self.channel.set_qos(prefetch_count=prefetch_count)
        
        # Declare the queue (in case it doesn't exist yet)
        queue = await self.channel.declare_queue(queue_name, durable=True, passive=True)
        
        # Start consuming
        consumer_tag = f"consumer-{queue_name}-{id(self)}"
        await queue.consume(
            lambda message: self._callback_wrapper(message, callback),
            consumer_tag=consumer_tag
        )
        
        logger.info(f"Started consuming from queue: {queue_name} with tag: {consumer_tag}")
        return consumer_tag

    async def publish(self, exchange: str, routing_key: str, message: Any):
        """
        Publish a message to the specified exchange with the given routing key asynchronously.
        
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
        
        # Get the exchange object
        exchange_obj = await self.channel.get_exchange(exchange)
        
        # Publish the message
        await exchange_obj.publish(
            aio_pika.Message(
                body=message.encode(),
                delivery_mode=MESSAGE_PERSISTENT,
                expiration=MESSAGE_TTL
            ),
            routing_key=routing_key
        )
        
        logger.info(f"Published message to exchange '{exchange}' with routing key '{routing_key}'")