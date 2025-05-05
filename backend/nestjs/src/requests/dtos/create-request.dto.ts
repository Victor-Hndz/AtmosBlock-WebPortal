import { IsString, IsBoolean, IsArray, ValidateIf, IsNotEmpty, IsOptional, IsUUID, IsNumber } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Request } from "@/requests/domain/entities/request.entity";
import { requestStatus } from "@/shared/enums/requestStatus.enum";

export class CreateRequestDto {
  @ApiProperty({ description: "Hash of the request" })
  @IsString()
  requestHash?: string;

  @ApiProperty({ description: "Name of the variable to process" })
  @IsString()
  @IsNotEmpty()
  variableName: string;

  @ApiProperty({ description: "Pressure levels for the data", type: [String] })
  @IsArray()
  @IsNotEmpty()
  @IsString({ each: true })
  pressureLevels: string[];

  @ApiProperty({ description: "Years to include", type: [String] })
  @IsArray()
  @IsNotEmpty()
  @IsString({ each: true })
  years: string[];

  @ApiProperty({ description: "Months to include", type: [String] })
  @IsArray()
  @IsNotEmpty()
  @IsString({ each: true })
  months: string[];

  @ApiProperty({ description: "Days to include", type: [String] })
  @IsArray()
  @IsNotEmpty()
  @IsString({ each: true })
  days: string[];

  @ApiProperty({ description: "Hours to include", type: [String] })
  @IsArray()
  @IsNotEmpty()
  @IsString({ each: true })
  hours: string[];

  @ApiProperty({ description: "Area coverage specifications", type: [String] })
  @IsArray()
  @IsNotEmpty()
  @IsString({ each: true })
  areaCovered: string[];

  @ApiProperty({ description: "Map types to generate", type: [String] })
  @IsArray()
  @IsNotEmpty()
  @IsString({ each: true })
  mapTypes: string[];

  @ApiProperty({ description: "Map ranges to use", type: [String] })
  @IsArray()
  @IsNotEmpty()
  @IsString({ each: true })
  mapRanges: string[];

  @ApiProperty({ description: "Map levels to use", type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  mapLevels?: string[];

  @ApiPropertyOptional({ description: "File format for output" })
  @IsString()
  @IsOptional()
  fileFormat?: string;

  @ApiPropertyOptional({ description: "Enable tracking", default: false })
  @IsBoolean()
  @IsOptional()
  tracking?: boolean;

  @ApiPropertyOptional({ description: "Skip compilation step", default: false })
  @IsBoolean()
  @IsOptional()
  noCompile?: boolean;

  @ApiPropertyOptional({ description: "Skip execution step", default: false })
  @IsBoolean()
  @IsOptional()
  noExecute?: boolean;

  @ApiPropertyOptional({ description: "Skip map generation", default: false })
  @IsBoolean()
  @IsOptional()
  noMaps?: boolean;

  @ApiPropertyOptional({ description: "Enable animation", default: false })
  @IsBoolean()
  @IsOptional()
  animation?: boolean;

  @ApiPropertyOptional({ description: "Enable OpenMP parallelization", default: false })
  @IsBoolean()
  @IsOptional()
  omp?: boolean;

  @ApiPropertyOptional({ description: "Enable MPI parallelization", default: false })
  @IsBoolean()
  @IsOptional()
  mpi?: boolean;

  @ApiPropertyOptional({ description: "Number of threads for OpenMP" })
  @ValidateIf(o => o.omp === true)
  @IsNumber()
  @IsOptional()
  nThreads?: number;

  @ApiPropertyOptional({ description: "Number of processes for MPI" })
  @ValidateIf(o => o.mpi === true)
  @IsNumber()
  @IsOptional()
  nProces?: number;

  @ApiPropertyOptional({ description: "ID of the user creating the request" })
  @IsUUID()
  @IsOptional()
  userId?: string;

  toRequest(): Request {
    const request = new Request({
      ...this,
      requestStatus: requestStatus.GENERATING,
      timesRequested: 1,
    });
    return request;
  }
}
