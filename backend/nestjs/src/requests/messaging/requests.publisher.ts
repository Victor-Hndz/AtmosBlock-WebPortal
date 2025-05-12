import { Inject, Injectable, Logger } from "@nestjs/common";
import { ClientProxy } from "@nestjs/microservices";
import { STATUS_OK } from "@/shared/consts/consts";
import { CreateRequestDto } from "../dtos/create-request.dto";

@Injectable()
export class RequestsPublisher {
  private readonly logger = new Logger(RequestsPublisher.name);

  constructor(@Inject("RABBITMQ_CONFIG_SERVICE") private readonly client: ClientProxy) {}

  sendRequestCreatedEvent(request: CreateRequestDto) {
    // Send it to exchange requests and routing key config.create
    this.client
      .connect()
      .then(() => {
        const data = {
          status: STATUS_OK,
          message: "New request created",
          content: JSON.stringify(request),
        };
        this.client.emit("config.create", data);
        this.logger.log("✅ Message sent to RabbitMQ");
      })
      .catch(err => {
        this.logger.error(`❌ Error sending message: ${err.message}`);
      });
  }
}
