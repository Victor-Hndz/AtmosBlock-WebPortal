import { Injectable, Logger } from "@nestjs/common";
import { AmqpConsumerService } from "@/shared/messaging/amqp-consumer.service";
import { RabbitMQExchanges, RabbitMQQueues, RabbitMQRoutingKeys } from "@/shared/enums/rabbitmqQueues.enum";
import { ProgressService } from "@/progress/services/progress.service";
import { GeneratedFilesService } from "../services/generatedFiles.service";
import { GeneratedFiles } from "../domain/entities/generatedFiles.entity";

interface ResultDoneMessage {
  request_hash: string;
  status: string;
  message: string;
}

@Injectable()
export class ResultsConsumer {
  private readonly logger = new Logger(ResultsConsumer.name);

  constructor(
    private readonly amqpConsumerService: AmqpConsumerService,
    private readonly progressService: ProgressService,
    private readonly generatedFilesService: GeneratedFilesService
  ) {}

  /**
   * Set up consumer for results.done messages
   */
  setupResultsDoneConsumer() {
    this.logger.log(
      `Setting up consumer for ${RabbitMQExchanges.RESULT_EXCHANGE}:${RabbitMQRoutingKeys.RESULT_DONE} on queue ${RabbitMQQueues.RESULT_QUEUE}`
    );

    this.amqpConsumerService.registerHandler(
      RabbitMQRoutingKeys.RESULT_DONE,
      RabbitMQQueues.RESULT_QUEUE,
      RabbitMQExchanges.RESULT_EXCHANGE,
      async (data: ResultDoneMessage) => {
        try {
          this.logger.log(`Received results.done message: ${JSON.stringify(data)}`);

          // Update progress to 100% when results are ready
          this.progressService.updateProgress({
            increment: 100,
            message: "Process completed. Results are ready.",
          });

          // Update the generated files record
          if (data.status === "OK" && data.request_hash) {
            await this.updateGeneratedFiles(data.request_hash);
          }
        } catch (error) {
          this.logger.error(`Error processing results.done message: ${error.message}`);
          this.logger.error(error.stack);
        }
      }
    );
  }

  /**
   * Update generated files record when processing is complete
   * @param requestHash Hash of the request
   */
  private async updateGeneratedFiles(requestHash: string) {
    try {
      // Create or update the generated files record
      const generatedFiles = new GeneratedFiles({
        requestHash: requestHash,
        status: "complete",
        generatedAt: new Date(),
      });

      await this.generatedFilesService.update(generatedFiles);
      this.logger.log(`Updated generated files record for request hash: ${requestHash}`);
    } catch (error) {
      this.logger.error(`Error updating generated files: ${error.message}`);
    }
  }
}
