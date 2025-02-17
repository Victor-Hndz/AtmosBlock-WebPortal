import { Inject, Injectable } from "@nestjs/common";
import { ClientProxy } from "@nestjs/microservices";
import { InputRequestDto } from "../dtos/inputRequestDto.dto";

@Injectable()
export class RequestsPublisher {
  constructor(@Inject("RABBITMQ_SERVICE") private readonly client: ClientProxy) {}

  sendRequestCreatedEvent(request: InputRequestDto) {
    //send it to exchange requests and routing key config.create
    this.client
      .connect()
      .then(() => {
        this.client.emit("config.create", JSON.stringify(request));
        console.log("✅ Mensaje enviado a RabbitMQ");
      })
      .catch(err => console.error("❌ Error enviando mensaje:", err));
  }
}
