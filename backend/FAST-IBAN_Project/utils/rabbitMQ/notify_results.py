from utils.rabbitMQ.rabbitmq import RabbitMQ
from utils.rabbitMQ.create_message import create_message
from utils.rabbitMQ.rabbit_consts import RESULTS_EXCHANGE, RESULTS_DONE_KEY
from utils.consts.consts import STATUS_OK

async def notify_result(rabbitmq: RabbitMQ, content: str):
    """
    Notify the results of the execution to RabbitMQ.

    Args:
        rabbitmq (RabbitMQ): The RabbitMQ instance to publish the message.
        content (str): The message to be sent.
    """
    message = create_message(STATUS_OK, "", content)
    await rabbitmq.publish(
        RESULTS_EXCHANGE,
        RESULTS_DONE_KEY,
        message
    )