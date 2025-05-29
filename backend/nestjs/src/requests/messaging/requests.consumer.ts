import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { RequestsService } from "../services/requests.service";
import { MessageContent } from "@/shared/interfaces/messageContentInterface.interface";
import { RabbitMQExchanges, RabbitMQQueues, RabbitMQRoutingKeys } from "@/shared/enums/rabbitmqQueues.enum";
import { AmqpConsumerService } from "@/shared/messaging/amqp-consumer.service";
import { ProgressService } from "@/progress/services/progress.service";
import { MAX_PROGRESS } from "@/shared/consts/consts";

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

          // After processing is complete, update progress to 100%
          this.progressService.updateProgress({
            increment: MAX_PROGRESS,
            message: "Process completed. Results are ready for viewing and download.",
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
