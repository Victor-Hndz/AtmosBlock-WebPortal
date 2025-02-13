import { Inject, Injectable } from "@nestjs/common";
import { ClientProxy } from "@nestjs/microservices";
import { InputRequestDto } from "../dtos/inputRequestDto.dto";

@Injectable()
export class RequestsPublisher {
  constructor(@Inject("RABBITMQ_SERVICE") private readonly client: ClientProxy) {}

  sendRequestCreatedEvent(request: InputRequestDto) {
    //send it to exchange requests and routing key config.create
    this.client.emit("config.create", JSON.stringify(request));
  }
}
