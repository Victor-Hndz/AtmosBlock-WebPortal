/**
 * generatedFiles domain entity - represents generatedFiles in the domain logic
 */
export class GeneratedFiles {
  id: string;
  requestHash: string;
  files: string[];
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date;

  constructor(props: Partial<GeneratedFiles>) {
    Object.assign(this, props);
  }
}
