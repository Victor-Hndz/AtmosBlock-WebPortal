import { GeneratedFiles } from "@/generatedFiles/domain/entities/generatedFiles.entity";
import { GeneratedFilesEntity } from "../entities/generatedFiles.entity";

export class GeneratedFilesMapper {
  static toDomain(entity: GeneratedFilesEntity): GeneratedFiles {
    return new GeneratedFiles({
      id: entity.id,
      requestHash: entity.requestHash,
      files: entity.files,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
      expiresAt: entity.expiresAt,
    });
  }

  static toPersistence(domain: GeneratedFiles): GeneratedFilesEntity {
    const entity = new GeneratedFilesEntity();

    entity.id = domain.id;
    entity.requestHash = domain.requestHash;
    entity.files = domain.files;
    entity.expiresAt = domain.expiresAt;

    return entity;
  }
}
