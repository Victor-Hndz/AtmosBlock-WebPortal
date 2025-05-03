import { Repository } from "typeorm";
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { IGeneratedFilesRepository } from "@/generatedFiles/domain/repositories/generatedFiles.repository";
import { GeneratedFilesEntity } from "@/generatedFiles/persistence/entities/generatedFiles.entity";
import { GeneratedFiles } from "@/generatedFiles/domain/entities/generatedFiles.entity";
import { GeneratedFilesMapper } from "../mappers/generatedFiles.mapper";

@Injectable()
export class TypeOrmGeneratedFilesRepository implements IGeneratedFilesRepository {
  constructor(
    @InjectRepository(GeneratedFilesEntity)
    private readonly generatedFilesRepository: Repository<GeneratedFilesEntity>
  ) {}

  async findAll(): Promise<GeneratedFiles[]> {
    const userEntities = await this.generatedFilesRepository.find();
    return userEntities.map(GeneratedFilesMapper.toDomain);
  }

  async findOne(id: string): Promise<GeneratedFiles> {
    const generatedFilesEntity = await this.generatedFilesRepository.findOneBy({ id });
    if (!generatedFilesEntity) {
      throw new Error(`GeneratedFiles with ID ${id} not found`);
    }
    return GeneratedFilesMapper.toDomain(generatedFilesEntity);
  }

  async findByRequestHash(requestHash: string): Promise<GeneratedFiles | null> {
    const generatedFilesEntity = await this.generatedFilesRepository.findOneBy({ requestHash });
    return generatedFilesEntity ? GeneratedFilesMapper.toDomain(generatedFilesEntity) : null;
  }

  async create(generatedFiles: GeneratedFiles): Promise<GeneratedFiles> {
    const generatedFilesEntity = GeneratedFilesMapper.toPersistence(generatedFiles);
    const savedEntity = await this.generatedFilesRepository.save(generatedFilesEntity);
    return GeneratedFilesMapper.toDomain(savedEntity);
  }

  async update(generatedFiles: GeneratedFiles): Promise<GeneratedFiles> {
    const existingEntity = await this.generatedFilesRepository.findOneBy({ id: generatedFiles.id });
    if (!existingEntity) {
      throw new Error(`GeneratedFiles with ID ${generatedFiles.id} not found`);
    }

    const updatedEntity = GeneratedFilesMapper.toPersistence(generatedFiles);
    const savedEntity = await this.generatedFilesRepository.save(updatedEntity);
    return GeneratedFilesMapper.toDomain(savedEntity);
  }

  async remove(id: string): Promise<void> {
    const existingEntity = await this.generatedFilesRepository.findOneBy({ id });
    if (!existingEntity) {
      throw new Error(`GeneratedFiles with ID ${id} not found`);
    }
    await this.generatedFilesRepository.remove(existingEntity);
  }
}
