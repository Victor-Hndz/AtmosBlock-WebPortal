import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Request } from "../entities/request.entity";
import { CreateRequestDto } from "../dtos/create-request.dto";
import { RequestsPublisher } from "../messaging/requests.publisher";
import { UsersService } from "../../users/services/users.service";

@Injectable()
export class RequestsService {
  constructor(
    @InjectRepository(Request)
    private readonly requestRepository: Repository<Request>,
    private readonly requestsPublisher: RequestsPublisher,
    private readonly usersService: UsersService
  ) {}

  async findAll(): Promise<Request[]> {
    return this.requestRepository.find({ relations: ["user"] });
  }

  async findAllByUser(userId: string): Promise<Request[]> {
    return this.requestRepository.find({
      where: { userId },
      relations: ["user"],
    });
  }

  async findOne(id: string): Promise<Request> {
    const request = await this.requestRepository.findOne({
      where: { id },
      relations: ["user"],
    });

    if (!request) {
      throw new NotFoundException(`Request with ID ${id} not found`);
    }

    return request;
  }

  async create(createRequestDto: CreateRequestDto): Promise<Request> {
    const request = this.requestRepository.create(createRequestDto);

    if (createRequestDto.userId) {
      await this.usersService.findOne(createRequestDto.userId);
      request.userId = createRequestDto.userId;
    }

    const savedRequest = await this.requestRepository.save(request);

    // Send event to RabbitMQ
    this.requestsPublisher.sendRequestCreatedEvent(savedRequest);

    return savedRequest;
  }

  async remove(id: string): Promise<void> {
    const request = await this.findOne(id);
    await this.requestRepository.remove(request);
  }

  async processRequest(createRequestDto: CreateRequestDto): Promise<Request> {
    return this.create(createRequestDto);
  }
}
