import { Body, Controller, Post } from "@nestjs/common";
import { RequestsService } from "../services/requests.service";
import { InputRequestDto } from "../dtos/inputRequestDto.dto";

@Controller("requests")
export class RequestsController {
  constructor(private readonly service: RequestsService) {}

  @Post("/")
  async launchRequest(@Body() request: InputRequestDto) {
    const response = await this.service.processRequest(request);
    return { message: response };
  }
}
