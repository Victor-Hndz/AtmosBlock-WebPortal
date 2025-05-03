import { GeneratedFiles } from "@/generatedFiles/domain/entities/generatedFiles.entity";

/**
 * generatedFiles repository interface - defines the contract for generatedFiles repository implementations
 */
export interface IGeneratedFilesRepository {
  findAll(): Promise<GeneratedFiles[]>;
  findOne(id: string): Promise<GeneratedFiles>;
  findByRequestHash(requestHash: string): Promise<GeneratedFiles | null>;
  create(request: GeneratedFiles): Promise<GeneratedFiles>;
  update(request: GeneratedFiles): Promise<GeneratedFiles>;
  remove(id: string): Promise<void>;
}
