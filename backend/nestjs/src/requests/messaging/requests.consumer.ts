import { Injectable, Logger } from "@nestjs/common";
import { Ctx, EventPattern, Payload, RmqContext } from "@nestjs/microservices";
import { RequestsService } from "../services/requests.service";

@Injectable()
export class RequestsConsumer {
  private readonly logger = new Logger(RequestsConsumer.name);

  constructor(private readonly requestsService: RequestsService) {}

  @EventPattern("result.done")
  async handleResultDone(@Payload() data: any, @Ctx() context: RmqContext) {
    try {
      this.logger.log(`Received result.done message: ${JSON.stringify(data)}`);

      // Process the received result
      await this.requestsService.processResultMessage(data);

      // Acknowledge the message
      const channel = context.getChannelRef();
      const originalMsg = context.getMessage();
      channel.ack(originalMsg);
    } catch (error) {
      this.logger.error(`Error processing result.done message: ${error.message}`);

      const channel = context.getChannelRef();
      const originalMsg = context.getMessage();
      channel.ack(originalMsg);
    }
  }
}
