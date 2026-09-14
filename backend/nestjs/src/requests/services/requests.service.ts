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
    const user = await this.usersService.findOneWithRequests(userId);
    if (!user.requests || user.requests.length === 0) {
      return [];
    }
    return user.requests;
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

      if (createRequestDto.variableName.toLowerCase() === "temperature") {
        createRequestDto.mapLevels.push("10");
      } else if (createRequestDto.variableName.toLowerCase() === "geopotential") {
        createRequestDto.mapLevels.push("20");
      } else {
        createRequestDto.mapLevels.push("20");
      }
    }
    const requestHash = this.generateRequestHash(createRequestDto);
    createRequestDto.requestHash = requestHash;
    this.logger.log(`Creating request with hash: ${requestHash}`);

    // Check if the request already exists
    const existingRequest = await this.requestRepository.findByRequestHash(requestHash);

    this.logger.log(`Existing request: ${JSON.stringify(existingRequest)}`);
    const processingMessage = JSON.stringify({
      status: STATUS_PROCESSING,
      message: `Request sent to process with ID ${requestHash}`,
      requestHash: requestHash,
    });

    if (existingRequest === null) {
      // New request: the user link is persisted together with the request (user_requests).
      const createRequest = createRequestDto.toRequest();
      if (createRequestDto.userId) {
        createRequest.users = [await this.usersService.findOne(createRequestDto.userId)];
      }
      await this.requestRepository.create(createRequest);
    } else if (existingRequest.requestStatus === requestStatus.CACHED) {
      existingRequest.timesRequested += 1;
      await this.linkUser(existingRequest, createRequestDto.userId);
      await this.requestRepository.update(existingRequest);

      this.progressService.updateProgress({
        increment: MAX_PROGRESS,
        message: "Process completed. Results are ready for viewing and download.",
      });

      await this.processResult(requestHash);

      return JSON.stringify({
        status: STATUS_CACHED,
        message: `Request cached`,
        requestHash: requestHash,
      });
    } else {
      // Existing request not cached: link the user so it shows in their requests (WEB-209).
      await this.linkUser(existingRequest, createRequestDto.userId);
      await this.requestRepository.update(existingRequest);

      if (existingRequest.requestStatus === requestStatus.GENERATING) {
        // Already being processed: do not publish it again.
        this.logger.log(`Request ${requestHash} already in progress; user linked, not re-published`);
        return processingMessage;
      }
    }

    // New, expired or empty request: emit a message to RabbitMQ for processing
    this.requestsPublisher.sendRequestCreatedEvent(createRequestDto);
    this.logger.log(`Request sent to process: ${processingMessage}`);
    return processingMessage;
  }

  /** Adds the user to the request's users if not already there (persisted by requestRepository.update). */
  private async linkUser(request: Request, userId?: string): Promise<void> {
    if (!userId) {
      return;
    }
    request.users = request.users ?? [];
    if (!request.users.some(u => u.id === userId)) {
      request.users.push(await this.usersService.findOne(userId));
      this.logger.log(`User ${userId} associated with existing request ${request.requestHash}`);
    }
  }

  async remove(id: string): Promise<void> {
    await this.requestRepository.remove(id);
  }

  /** Petición del usuario; si no existe o es de otro, NotFoundException (no se revela que exista). */
  async findOneForUser(id: string, userId: string): Promise<Request> {
    const request = await this.requestRepository.findOneByIdAndUser(id, userId);
    if (!request) {
      throw new NotFoundException(`Request with ID ${id} not found`);
    }
    return request;
  }

  /**
   * Una petición puede pertenecer a varios usuarios (se reutiliza por hash): se desvincula al usuario
   * y la petición solo se borra si ya no le queda ninguno.
   */
  async removeForUser(id: string, userId: string): Promise<void> {
    await this.findOneForUser(id, userId);
    await this.requestRepository.removeUser(id, userId);

    if ((await this.requestRepository.countUsers(id)) === 0) {
      await this.requestRepository.remove(id);
    }
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

      this.logger.debug(`Message: ${JSON.stringify(message)}`);
      this.logger.debug(`Message content type: ${typeof message.content}`);

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
