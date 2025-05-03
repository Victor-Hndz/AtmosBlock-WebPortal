import { GeneratedFilesStatusEnum } from "@/shared/enums/generatedFilesStatusEnum.enum";

/**
 * generatedFiles domain entity - represents generatedFiles in the domain logic
 */
export class GeneratedFiles {
  id: string;
  requestHash: string;
  files: string[];
  status: GeneratedFilesStatusEnum;
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date;

  constructor(props: Partial<GeneratedFiles>) {
    Object.assign(this, props);
  }
}
