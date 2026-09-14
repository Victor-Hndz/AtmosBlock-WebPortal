import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { RequestsService } from "../services/requests.service";
import { MessageContent, ResultMessageContent } from "@/shared/interfaces/messageContentInterface.interface";
import { RabbitMQExchanges, RabbitMQQueues, RabbitMQRoutingKeys } from "@/shared/enums/rabbitmqQueues.enum";
import { AmqpConsumerService } from "@/shared/messaging/amqp-consumer.service";
import { ProgressService } from "@/progress/services/progress.service";
import { MAX_PROGRESS } from "@/shared/consts/consts";

const REQUEST_FAILED_MESSAGE = "The request could not be processed. Please try again later.";

@Injectable()
export class RequestsConsumer implements OnModuleInit {
  private readonly logger = new Logger(RequestsConsumer.name);

  constructor(
    private readonly requestsService: RequestsService,
    private readonly amqpConsumerService: AmqpConsumerService,
    private readonly progressService: ProgressService
  ) {}

  /**
   * Register message handlers when module initializes
   */
  async onModuleInit() {
    this.setupResultDoneConsumer();
  }

  /**
   * Set up consumer for result.done messages
   */
  private setupResultDoneConsumer() {
    this.amqpConsumerService.registerHandler(
      RabbitMQRoutingKeys.RESULT_DONE,
      RabbitMQQueues.RESULT_QUEUE,
      RabbitMQExchanges.RESULT_EXCHANGE,
      async (data: MessageContent) => {
        try {
          this.logger.log(`Received results.done message: ${JSON.stringify(data)}`);

          // Process the message first to ensure data is available
          await this.requestsService.processResultMessage(data);

          // After processing is complete, update the request's progress to 100%.
          // WEB-211: a failed request closes the progress with a generic error; the details stay in the logs.
          const { requestHash } = (data.content ?? {}) as ResultMessageContent;
          const failed = data.status !== "OK";
          this.progressService.updateProgress({
            requestHash,
            increment: MAX_PROGRESS,
            message: failed ? REQUEST_FAILED_MESSAGE : "Process completed. Results are ready for viewing and download.",
            ...(failed && { error: REQUEST_FAILED_MESSAGE }),
          });
        } catch (error) {
          this.logger.error(`Error processing results.done message: ${error.message}`);
          this.logger.error(error.stack);
          // The AmqpConsumerService will handle the acknowledgment
        }
      }
    );
  }
}
