import { GeneratedFiles } from "@/generatedFiles/domain/entities/generatedFiles.entity";
import { User } from "@/users/domain/entities/user.entity";

/**
 * Request domain entity - represents a request in the domain logic
 */
export class Request {
  id: string;
  requestHash: string;
  variableName: string;
  pressureLevels: string[];
  years: string[];
  months: string[];
  days: string[];
  hours: string[];
  areaCovered: string[];
  mapRanges: string[];
  mapTypes: string[];
  mapLevels?: string[];
  fileFormat?: string;
  tracking: boolean;
  noCompile: boolean;
  noExecute: boolean;
  noMaps: boolean;
  animation: boolean;
  omp: boolean;
  mpi: boolean;
  nThreads?: number;
  nProces?: number;
  timesRequested: number;
  createdAt: Date;
  updatedAt: Date;
  user?: User;
  generatedFiles: GeneratedFiles;

  constructor(props: Partial<Request>) {
    Object.assign(this, props);
  }
}
