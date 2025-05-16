import { Injectable, Logger } from "@nestjs/common";
import { Ctx, EventPattern, Payload, RmqContext } from "@nestjs/microservices";
import { ProgressService } from "../services/progress.service";
import { ProgressEvent } from "../domain/progress.interface";
import { MessageContent } from "@/shared/interfaces/messageContentInterface.interface";

@Injectable()
export class ProgressConsumer {
  private readonly logger = new Logger(ProgressConsumer.name);

  constructor(private readonly progressService: ProgressService) {}

  @EventPattern("progress.update")
  async handleProgressUpdate(@Payload() data: MessageContent, @Ctx() context: RmqContext) {
    try {
      this.logger.log(`Received progress.update message: ${JSON.stringify(data)}`);

      // Validate the message structure
      if (data?.content) {
        let progressContent: ProgressEvent | undefined = undefined;

        // Parse the content if it's a string
        if (typeof data.content === "string") {
          try {
            progressContent = JSON.parse(data.content) as ProgressEvent;
          } catch (e) {
            this.logger.error(`Invalid JSON in progress message content: ${e.message}`);
          }
        } else {
          progressContent = data.content as unknown as ProgressEvent;
        }

        // Validate and process the progress event
        if (
          progressContent &&
          typeof progressContent.increment === "number" &&
          typeof progressContent.message === "string"
        ) {
          this.progressService.updateProgress({
            increment: progressContent.increment,
            message: progressContent.message,
          });
        } else {
          this.logger.warn(`Invalid progress content structure: ${JSON.stringify(progressContent)}`);
        }
      } else {
        this.logger.warn(`Invalid message structure: ${JSON.stringify(data)}`);
      }

      // Acknowledge the message
      const channel = context.getChannelRef();
      const originalMsg = context.getMessage();
      channel.ack(originalMsg);
    } catch (error) {
      this.logger.error(`Error processing progress.update message: ${error.message}`);

      // Even on error, acknowledge the message to prevent it from being requeued
      const channel = context.getChannelRef();
      const originalMsg = context.getMessage();
      channel.ack(originalMsg);
    }
  }
}
