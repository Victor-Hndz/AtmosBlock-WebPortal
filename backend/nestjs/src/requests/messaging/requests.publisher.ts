import { Inject, Injectable } from "@nestjs/common";
import { ClientProxy } from "@nestjs/microservices";
import { InputRequestDto } from "../dtos/inputRequestDto.dto";
import { STATUS_OK } from "src/shared/consts/consts";

@Injectable()
export class RequestsPublisher {
  constructor(@Inject("RABBITMQ_SERVICE") private readonly client: ClientProxy) {}

  sendRequestCreatedEvent(request: InputRequestDto) {
    //send it to exchange requests and routing key config.create
    this.client
      .connect()
      .then(() => {
        const message = {
          status: STATUS_OK,
          message: "",
          data: JSON.stringify(request),
        };
        this.client.emit("config.create", message); // Stringify the entire message once
        console.log("✅ Mensaje enviado a RabbitMQ");
      })
      .catch(err => console.error("❌ Error enviando mensaje:", err));
  }
}
