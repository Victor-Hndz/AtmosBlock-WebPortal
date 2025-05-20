import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { RequestsService } from "../services/requests.service";
import { MessageContent } from "@/shared/interfaces/messageContentInterface.interface";
import { RabbitMQExchanges, RabbitMQQueues, RabbitMQRoutingKeys } from "@/shared/enums/rabbitmqQueues.enum";
import { AmqpConsumerService } from "@/shared/messaging/amqp-consumer.service";

@Injectable()
export class RequestsConsumer implements OnModuleInit {
  private readonly logger = new Logger(RequestsConsumer.name);

  constructor(
    private readonly requestsService: RequestsService,
    private readonly amqpConsumerService: AmqpConsumerService
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
          await this.requestsService.processResultMessage(data);
        } catch (error) {
          this.logger.error(`Error processing results.done message: ${error.message}`);
          this.logger.error(error.stack);
          // The AmqpConsumerService will handle the acknowledgment
        }
      }
    );
  }
}
