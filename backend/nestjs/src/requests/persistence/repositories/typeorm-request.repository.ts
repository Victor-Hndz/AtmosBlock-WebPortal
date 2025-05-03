import { Repository } from "typeorm";
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Request } from "@/requests/domain/entities/request.entity";
import { IRequestRepository } from "@/requests/domain/repositories/request.repository.interface";
import { RequestEntity } from "../entities/request.entity";
import { RequestMapper } from "../mappers/request.mapper";

@Injectable()
export class TypeOrmRequestRepository implements IRequestRepository {
  constructor(
    @InjectRepository(RequestEntity)
    private readonly requestRepository: Repository<RequestEntity>
  ) {}

  async findAll(): Promise<Request[]> {
    const requestEntities = await this.requestRepository.find();
    return requestEntities.map(requestEntity => RequestMapper.toDomain(requestEntity));
  }

  async findOne(id: string): Promise<Request> {
    const requestEntity = await this.requestRepository.findOneBy({ id });
    if (!requestEntity) {
      throw new Error(`Request with id ${id} not found`);
    }
    return RequestMapper.toDomain(requestEntity);
  }

  async findByRequestHash(requestHash: string): Promise<Request | null> {
    const requestEntity = await this.requestRepository.findOneBy({ requestHash });
    if (!requestEntity) {
      return null;
    }
    return RequestMapper.toDomain(requestEntity);
  }

  async findByUserId(userId: string): Promise<Request[]> {
    const requestEntities = await this.requestRepository.find({
      where: { user: { id: userId } },
      relations: ["user"],
    });
    return requestEntities.map(requestEntity => RequestMapper.toDomain(requestEntity));
  }

  async create(request: Request): Promise<Request> {
    const requestEntity = RequestMapper.toPersistence(request);
    const savedRequestEntity = await this.requestRepository.save(requestEntity);
    return RequestMapper.toDomain(savedRequestEntity);
  }

  async update(request: Request): Promise<Request> {
    const requestEntity = RequestMapper.toPersistence(request);
    const updatedRequestEntity = await this.requestRepository.save(requestEntity);
    return RequestMapper.toDomain(updatedRequestEntity);
  }

  async remove(id: string): Promise<void> {
    const requestEntity = await this.requestRepository.findOneBy({ id });
    if (!requestEntity) {
      throw new Error(`Request with id ${id} not found`);
    }
    await this.requestRepository.remove(requestEntity);
  }
}
