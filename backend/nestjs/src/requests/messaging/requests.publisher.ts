import { Injectable, Logger } from "@nestjs/common";
import { STATUS_OK } from "@/shared/consts/consts";
import { CreateRequestDto } from "../dtos/create-request.dto";
import { AmqpService } from "@/shared/messaging/amqp.service";
import { RabbitMQRoutingKeys } from "@/shared/enums/rabbitmqQueues.enum";

@Injectable()
export class RequestsPublisher {
  private readonly logger = new Logger(RequestsPublisher.name);

  constructor(private readonly amqpService: AmqpService) {}

  async sendRequestCreatedEvent(request: CreateRequestDto) {
    try {
      const data = {
        status: STATUS_OK,
        message: "New request created",
        content: JSON.stringify(request),
      };

      const result = await this.amqpService.emit(RabbitMQRoutingKeys.CONFIG_CREATE, data);

      if (result) {
        this.logger.log("✅ Message sent to RabbitMQ");
      } else {
        this.logger.warn("⚠️ Message sending returned false, may not have been delivered");
      }
    } catch (error) {
      this.logger.error(`❌ Error sending message: ${error.message}`);
    }
  }
}
