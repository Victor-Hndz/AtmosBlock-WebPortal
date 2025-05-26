import { Inject, Injectable } from "@nestjs/common";
import { GeneratedFiles } from "@/generatedFiles/domain/entities/generatedFiles.entity";
import { IGeneratedFilesRepository } from "../domain/repositories/generatedFiles.repository";

@Injectable()
export class GeneratedFilesService {
  constructor(
    @Inject("IGeneratedFilesRepository")
    private readonly generatedFilesRepository: IGeneratedFilesRepository
  ) {}

  async create(generatedFiles: GeneratedFiles): Promise<GeneratedFiles> {
    const createdEntity = await this.generatedFilesRepository.create(generatedFiles);
    return createdEntity;
  }

  async update(generatedFiles: GeneratedFiles): Promise<GeneratedFiles> {
    const updatedEntity = await this.generatedFilesRepository.update(generatedFiles);
    return updatedEntity;
  }
}
