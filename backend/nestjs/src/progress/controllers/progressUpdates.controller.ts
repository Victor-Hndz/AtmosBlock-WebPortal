import { Controller, Logger, OnModuleInit } from "@nestjs/common";
import { ProgressConsumer } from "../messaging/progress.consumer";
import { RabbitMQExchanges, RabbitMQQueues, RabbitMQRoutingKeys } from "@/shared/enums/rabbitmqQueues.enum";
import { ProgressEvent } from "../domain/progress.interface";
import { AmqpConsumerService } from "@/shared/messaging/amqp-consumer.service";

interface MessageContentUpdate {
  status: string;
  message: string;
  content: ProgressEvent;
}

@Controller("progress/updates")
export class ProgressUpdatesController implements OnModuleInit {
  private readonly logger = new Logger(ProgressUpdatesController.name);

  constructor(
    private readonly progressConsumer: ProgressConsumer,
    private readonly amqpConsumerService: AmqpConsumerService
  ) {}

  /**
   * Register message handlers when module initializes
   */
  async onModuleInit() {
    this.setupProgressUpdateConsumer();
  }

  /**
   * Set up consumer for progress.update messages
   */
  private setupProgressUpdateConsumer() {
    this.logger.log(
      `Setting up consumer for ${RabbitMQExchanges.PROGRESS_EXCHANGE}:${RabbitMQRoutingKeys.PROGRESS_UPDATE} on queue ${RabbitMQQueues.PROGRESS_QUEUE}`
    );

    this.amqpConsumerService.registerHandler(
      RabbitMQRoutingKeys.PROGRESS_UPDATE,
      RabbitMQQueues.PROGRESS_QUEUE,
      RabbitMQExchanges.PROGRESS_EXCHANGE,
      async (data: MessageContentUpdate) => {
        try {
          this.logger.log(`Received progress.update message: ${JSON.stringify(data)}`);
          const result = await this.progressConsumer.handleProgressUpdate(data.content);

          if (!result) {
            this.logger.warn(`Invalid progress content structure: ${JSON.stringify(data)}`);
          }
        } catch (error) {
          this.logger.error(`Error processing progress.update message: ${error.message}`);
          this.logger.error(error.stack);
          // The AmqpConsumerService will handle the acknowledgment
        }
      }
    );
  }
}
