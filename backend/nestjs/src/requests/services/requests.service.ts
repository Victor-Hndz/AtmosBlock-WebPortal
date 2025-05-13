import { createHash } from "crypto";
import { Inject, Injectable, NotFoundException, Logger } from "@nestjs/common";
import { Request } from "@/requests/domain/entities/request.entity";
import { CreateRequestDto } from "@/requests/dtos/create-request.dto";
import { RequestsPublisher } from "@/requests/messaging/requests.publisher";
import { IRequestRepository } from "@/requests/domain/repositories/request.repository.interface";
import { GeneratedFilesService } from "@/generatedFiles/services/generatedFiles.service";
import { STATUS_PROCESSING } from "@/shared/consts/consts";
import { requestStatus } from "@/shared/enums/requestStatus.enum";

@Injectable()
export class RequestsService {
  private readonly logger = new Logger(RequestsService.name);

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
    this.logger.log(`Creating request with hash: ${requestHash}`);

    // Check if the request already exists
    const existingRequest = await this.requestRepository.findByRequestHash(requestHash);
    this.logger.log(`Existing request: ${JSON.stringify(existingRequest)}`);
    if (existingRequest !== null && existingRequest.requestStatus == requestStatus.CACHED) {
      // If it exists, increment the timesRequested
      existingRequest.timesRequested += 1;

      //update TTL by 7 days
      existingRequest.generatedFiles.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      await this.generatedFilesService.update(existingRequest.generatedFiles);

      await this.requestRepository.update(existingRequest);
      return existingRequest;
    } else if (existingRequest === null) {
      await this.requestRepository.create(createRequestDto.toRequest());
    }

    //If not exists and cached, emit a message to RabbitMQ for processing
    this.requestsPublisher.sendRequestCreatedEvent(createRequestDto);
    const message = { status: STATUS_PROCESSING, message: `Request sent to process with ID ${requestHash}` };
    this.logger.log(`Request sent to process: ${JSON.stringify(message)}`);
    return JSON.stringify(message);
  }

  async remove(id: string): Promise<void> {
    await this.requestRepository.remove(id);
  }

  async processResultMessage(message: any): Promise<void> {
    this.logger.log(`Processing result message: ${JSON.stringify(message)}`);

    try {
      // Extract data from the message
      const { requestHash, resultData, errorMessage } = message;

      if (!requestHash) {
        this.logger.error("Invalid message: missing requestHash");
        return;
      }

      // Find the request by hash
      const request = await this.requestRepository.findByRequestHash(requestHash);

      if (!request) {
        this.logger.warn(`Request with hash ${requestHash} not found`);
        return;
      }

      // If there's an error message, log it
      if (errorMessage) {
        this.logger.error(`Error processing request ${requestHash}: ${errorMessage}`);
      }

      // If there's result data, update the request's generated files
      if (resultData) {
        // Assuming resultData contains paths or information about generated files
        const generatedFiles = request.generatedFiles || {};

        // Update the generated files with information from resultData
        // This will depend on your data structure
        generatedFiles.files = resultData.files ?? [];
        generatedFiles.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days TTL

        // Update generated files in the database
        await this.generatedFilesService.update(generatedFiles);
      }

      // Update the request in the database
      await this.requestRepository.update(request);

      this.logger.log(`Successfully processed result for request ${requestHash}`);
    } catch (error) {
      this.logger.error(`Error processing result message: ${error.message}`);
      throw error;
    }
  }

  generateRequestHash(createRequestDto: CreateRequestDto): string {
    const { requestHash, userId, ...rest } = createRequestDto;
    const str = JSON.stringify(rest);
    return createHash("sha256").update(str).digest("hex");
  }
}
