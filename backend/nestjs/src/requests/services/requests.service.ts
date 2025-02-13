import { Injectable } from "@nestjs/common";
import { InputRequestDto } from "../dtos/inputRequestDto.dto";
import { RequestsPublisher } from "../messaging/requests.publisher";

@Injectable()
export class RequestsService {
  constructor(private readonly requestsPublisher: RequestsPublisher) {}

  async processRequest(request: InputRequestDto): Promise<string> {
    // Process the request
    this.requestsPublisher.sendRequestCreatedEvent(request);
    return "Request sended to queue";
  }
}
