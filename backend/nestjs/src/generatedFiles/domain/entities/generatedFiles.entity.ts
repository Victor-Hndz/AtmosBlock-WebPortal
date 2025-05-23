/**
 * generatedFiles domain entity - represents generatedFiles in the domain logic
 */
export class GeneratedFiles {
  id: string;
  requestHash: string;
  files: string[];
  status: string;
  createdAt: Date;
  updatedAt: Date;
  generatedAt: Date;
  expiresAt: Date;

  constructor(props: Partial<GeneratedFiles>) {
    Object.assign(this, props);
  }
}
