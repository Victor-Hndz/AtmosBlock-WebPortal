import { createHash } from "crypto";
import { Inject, Injectable, NotFoundException, Logger } from "@nestjs/common";
import { Request } from "@/requests/domain/entities/request.entity";
import { CreateRequestDto } from "@/requests/dtos/create-request.dto";
import { RequestsPublisher } from "@/requests/messaging/requests.publisher";
import { IRequestRepository } from "@/requests/domain/repositories/request.repository.interface";
import { GeneratedFilesService } from "@/generatedFiles/services/generatedFiles.service";
import { MAX_PROGRESS, STATUS_CACHED, STATUS_PROCESSING } from "@/shared/consts/consts";
import { requestStatus } from "@/shared/enums/requestStatus.enum";
import { MessageContent, ResultMessageContent } from "@/shared/interfaces/messageContentInterface.interface";
import { MinioService } from "@/minio/services/minio.service";
import { GeneratedFiles } from "@/generatedFiles/domain/entities/generatedFiles.entity";
import { UsersService } from "@/users/services/users.service";
import { ProgressService } from "@/progress/services/progress.service";

@Injectable()
export class RequestsService {
  private readonly logger = new Logger(RequestsService.name);

  constructor(
    @Inject("IRequestRepository")
    private readonly requestRepository: IRequestRepository,
    private readonly requestsPublisher: RequestsPublisher,
    private readonly generatedFilesService: GeneratedFilesService,
    private readonly progressService: ProgressService,
    private readonly usersService: UsersService,
    private readonly minioService: MinioService
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
    if (!createRequestDto.mapLevels || createRequestDto.mapLevels.length <= 0) {
      createRequestDto.mapLevels = createRequestDto.mapLevels ?? [];
      createRequestDto.mapLevels.push("20");
    }
    const requestHash = this.generateRequestHash(createRequestDto);
    createRequestDto.requestHash = requestHash;
    this.logger.log(`Creating request with hash: ${requestHash}`);

    // Check if the request already exists
    const existingRequest = await this.requestRepository.findByRequestHash(requestHash);
    this.logger.log(`Existing request: ${JSON.stringify(existingRequest)}`);
    if (existingRequest !== null && existingRequest.requestStatus === requestStatus.CACHED) {
      // If it exists, increment the timesRequested
      existingRequest.timesRequested += 1;

      await this.requestRepository.update(existingRequest);

      this.progressService.updateProgress({
        increment: MAX_PROGRESS,
        message: "Process completed. Results are ready for viewing and download.",
      });

      await this.processResult(requestHash);

      const message = {
        status: STATUS_CACHED,
        message: `Request cached`,
        requestHash: requestHash,
      };

      return JSON.stringify(message);
    } else if (existingRequest === null) {
      const createRequest = createRequestDto.toRequest();
      if (createRequestDto.userId) {
        createRequest.user = await this.usersService.findOne(createRequestDto.userId);
      }
      await this.requestRepository.create(createRequest);
    }

    //If not exists and cached, emit a message to RabbitMQ for processing
    this.requestsPublisher.sendRequestCreatedEvent(createRequestDto);
    const message = {
      status: STATUS_PROCESSING,
      message: `Request sent to process with ID ${requestHash}`,
      requestHash: requestHash,
    };
    this.logger.log(`Request sent to process: ${JSON.stringify(message)}`);
    return JSON.stringify(message);
  }

  async remove(id: string): Promise<void> {
    await this.requestRepository.remove(id);
  }

  async processResultMessage(message: MessageContent): Promise<void> {
    this.logger.log(`Processing result message: ${JSON.stringify(message)}`);
    try {
      // Check if message has the expected structure
      if (!message || typeof message !== "object") {
        this.logger.error("Invalid message: message is not an object");
        return;
      }

      // Check status first
      const messageStatus = message.status;

      console.log(`Message: ${JSON.stringify(message)}`);
      console.log(`Message content: ${JSON.stringify(message)}`);
      console.log(`Message content type: ${typeof message.content}`);

      if (typeof message.content !== "object" || message.content === null) {
        this.logger.error("Invalid message content: not a ResultMessageContent object");
        return;
      }
      const messageContent = message.content as ResultMessageContent;
      const requestHash = messageContent.requestHash;
      const messageText = messageContent.content;

      if (messageStatus !== "OK") {
        this.logger.error(
          `Error in result message. Status: ${messageStatus}, Message: ${messageText}, Request Hash: ${requestHash}`
        );
        return;
      }

      await this.processResult(requestHash);
    } catch (error) {
      this.logger.error(`Error processing result message: ${error.message}`);
      throw error;
    }
  }

  private async processResult(requestHash: string) {
    // Find the request by hash
    const request = await this.requestRepository.findByRequestHash(requestHash);

    if (!request) {
      this.logger.warn(`Request with hash ${requestHash} not found`);
      return;
    }

    try {
      // Check if the folder with results exists in Minio
      const folderExists = await this.minioService.folderExists(requestHash);

      if (!folderExists) {
        this.logger.error(`No result folder found in storage for request ${requestHash}`);
        request.requestStatus = requestStatus.EMPTY;
        await this.requestRepository.update(request);
        return;
      }

      // List all files in the request's result folder
      const minioFiles = await this.minioService.listFiles(requestHash);

      if (minioFiles.length === 0) {
        this.logger.warn(`No files found in result folder for request ${requestHash}`);
        request.requestStatus = requestStatus.EMPTY;
        await this.requestRepository.update(request);
        return;
      }

      // Prepare the file list for the database
      const filesList = minioFiles.map(file => file.url);

      // Create or update generated files entry
      let generatedFiles = request.generatedFiles;

      if (!generatedFiles) {
        // Create new generatedFiles object
        generatedFiles = new GeneratedFiles({
          requestHash: request.requestHash,
          files: filesList,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days TTL
        });

        // Save to database
        const savedGeneratedFiles = await this.generatedFilesService.create(generatedFiles);
        request.generatedFiles = savedGeneratedFiles;
      } else {
        // Update existing generatedFiles object
        generatedFiles.files = filesList;
        generatedFiles.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days TTL
        request.generatedFiles = generatedFiles;

        // Update in database
        await this.generatedFilesService.update(generatedFiles);
      }

      // Update request status
      request.requestStatus = requestStatus.CACHED;

      // Update the request in the database
      await this.requestRepository.update(request);

      this.logger.log(`Successfully processed result for request ${requestHash} with ${filesList.length} files`);
    } catch (error) {
      this.logger.error(`Error retrieving files from storage for request ${requestHash}: ${error.message}`);
      request.requestStatus = requestStatus.EMPTY;
      await this.requestRepository.update(request);
    }
  }

  private generateRequestHash(createRequestDto: CreateRequestDto): string {
    const str = this.normalizeDtoForHash(createRequestDto);
    return createHash("sha256").update(str).digest("hex");
  }

  private normalizeDtoForHash(dto: CreateRequestDto): string {
    // Campos que deben aparecer y su orden deseado
    const orderedKeys: (keyof CreateRequestDto)[] = [
      "variableName",
      "pressureLevels",
      "years",
      "months",
      "days",
      "hours",
      "areaCovered",
      "mapTypes",
      "mapLevels",
      "fileFormat",
      "noData",
      "noMaps",
      "omp",
      "mpi",
      "nThreads",
      "nProces",
    ];

    const normalized: Record<string, any> = {};

    for (const key of orderedKeys) {
      const value = dto[key];

      // Saltar campos undefined o null
      if (value === undefined || value === null) continue;

      if (Array.isArray(value)) {
        // Ordenar arrays: numéricamente si todos los valores son números
        const allNumeric = value.every(v => !isNaN(Number(v)));
        normalized[key] = [...value].sort((a, b) =>
          allNumeric ? Number(a) - Number(b) : String(a).localeCompare(String(b))
        );
      } else {
        normalized[key] = value;
      }
    }

    return JSON.stringify(normalized);
  }
}
