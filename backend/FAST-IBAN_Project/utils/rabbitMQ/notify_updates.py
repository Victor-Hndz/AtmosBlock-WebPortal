from utils.rabbitMQ.rabbitmq import RabbitMQ
from utils.rabbitMQ.create_message import create_message
from utils.rabbitMQ.rabbit_consts import PROGRESS_EXCHANGE, PROGRESS_UPDATE_KEY
from utils.consts.consts import STATUS_OK

async def notify_update(rabbitmq: RabbitMQ, increment: int, message: str):
    """
    Notify the progress of the configurator process to RabbitMQ.

    Args:
        rabbitmq (RabbitMQ): The RabbitMQ instance to publish the message.
        increment (int): The increment value for the progress.
        message (str): The message to be sent.
    """
    progress = {"increment": increment, "message": message}
    message = create_message(STATUS_OK, "", progress)
    await rabbitmq.publish(
        PROGRESS_EXCHANGE,
        PROGRESS_UPDATE_KEY,
        message
    )