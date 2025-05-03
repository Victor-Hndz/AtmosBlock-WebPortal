import { createHash } from "crypto";
import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { Request } from "@/requests/domain/entities/request.entity";
import { CreateRequestDto } from "@/requests/dtos/create-request.dto";
import { RequestsPublisher } from "@/requests/messaging/requests.publisher";
import { IRequestRepository } from "@/requests/domain/repositories/request.repository.interface";
import { GeneratedFilesService } from "@/generatedFiles/services/generatedFiles.service";
import { STATUS_PROCESSING } from "@/shared/consts/consts";

@Injectable()
export class RequestsService {
  constructor(
    @Inject("IRequestRepository")
    private readonly requestRepository: IRequestRepository,
    private readonly requestsPublisher: RequestsPublisher,
    private readonly generatedFilesService: GeneratedFilesService
  ) {}

  async findAll(): Promise<Request[]> {
    return this.requestRepository.findAll();
  }

  async findAllByUser(userId: string): Promise<Request[]> {
    return this.requestRepository.findByUserId(userId);
  }

  async findOne(id: string): Promise<Request> {
    const request = await this.requestRepository.findOne(id);

    if (!request) {
      throw new NotFoundException(`Request with ID ${id} not found`);
    }

    return request;
  }

  async create(createRequestDto: CreateRequestDto): Promise<Request | string> {
    //Generate the requestHash
    const requestHash = this.generateRequestHash(createRequestDto);
    createRequestDto.requestHash = requestHash;

    // Check if the request already exists
    const existingRequest = await this.requestRepository.findByRequestHash(requestHash);
    if (existingRequest !== null) {
      // If it exists, increment the timesRequested
      existingRequest.timesRequested += 1;

      //update TTL by 7 days
      existingRequest.generatedFiles.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      await this.generatedFilesService.update(existingRequest.generatedFiles);

      await this.requestRepository.update(existingRequest);
      return existingRequest;
    }
    //If not exists, emit a message to RabbitMQ
    this.requestsPublisher.sendRequestCreatedEvent(createRequestDto);
    const message = { status: STATUS_PROCESSING, message: `Request sent to process with ID ${requestHash}` };
    return JSON.stringify(message);
  }

  async remove(id: string): Promise<void> {
    await this.requestRepository.remove(id);
  }

  generateRequestHash(createRequestDto: CreateRequestDto): string {
    const str = JSON.stringify(createRequestDto);
    return createHash("sha256").update(str).digest("hex");
  }
}
