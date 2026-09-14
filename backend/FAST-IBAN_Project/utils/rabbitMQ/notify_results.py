from utils.rabbitMQ.rabbitmq import RabbitMQ
from utils.rabbitMQ.create_message import create_message
from utils.rabbitMQ.rabbit_consts import RESULTS_EXCHANGE, RESULTS_DONE_KEY
from utils.consts.consts import STATUS_OK

async def notify_result(rabbitmq: RabbitMQ, content_str: str, request_hash: str, status: str = STATUS_OK) -> None:
    """
    Notify the results of the execution to RabbitMQ.

    Args:
        rabbitmq (RabbitMQ): The RabbitMQ instance to publish the message.
        content (str): The message to be sent.
        request_hash (str): Hash of the request.
        status (str): STATUS_OK, or STATUS_ERROR if the pipeline failed (WEB-211).
    """
    content = {
        "requestHash": request_hash,
        "content": content_str
    }
    message = create_message(status, "", content)
    await rabbitmq.publish(
        RESULTS_EXCHANGE,
        RESULTS_DONE_KEY,
        message
    )
