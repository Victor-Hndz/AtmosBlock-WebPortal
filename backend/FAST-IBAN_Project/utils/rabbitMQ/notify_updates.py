from utils.rabbitMQ.rabbitmq import RabbitMQ
from utils.rabbitMQ.create_message import create_message
from utils.rabbitMQ.rabbit_consts import PROGRESS_EXCHANGE, PROGRESS_UPDATE_KEY
from utils.consts.consts import STATUS_OK

async def notify_update(rabbitmq: RabbitMQ, request_hash: str, increment: int, message: str):
    """
    Notify the progress of a request to RabbitMQ.

    Args:
        rabbitmq (RabbitMQ): The RabbitMQ instance to publish the message.
        request_hash (str): Hash of the request the progress belongs to.
        increment (int): The increment value for the progress.
        message (str): The message to be sent.
    """
    progress = {"requestHash": request_hash, "increment": increment, "message": message}
    message = create_message(STATUS_OK, "", progress)
    await rabbitmq.publish(
        PROGRESS_EXCHANGE,
        PROGRESS_UPDATE_KEY,
        message
    )
