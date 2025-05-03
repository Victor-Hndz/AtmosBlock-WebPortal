import { GeneratedFiles } from "@/generatedFiles/domain/entities/generatedFiles.entity";
import { GeneratedFilesEntity } from "../entities/generatedFiles.entity";

export class GeneratedFilesMapper {
  static toDomain(entity: GeneratedFilesEntity): GeneratedFiles {
    return new GeneratedFiles({
      id: entity.id,
      requestHash: entity.requestHash,
      files: entity.files,
      status: entity.status,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
      expiresAt: entity.expires_at,
    });
  }

  static toPersistence(domain: GeneratedFiles): GeneratedFilesEntity {
    const entity = new GeneratedFilesEntity();

    entity.id = domain.id;
    entity.requestHash = domain.requestHash;
    entity.files = domain.files;
    entity.status = domain.status;
    entity.expires_at = domain.expiresAt;

    return entity;
  }
}
