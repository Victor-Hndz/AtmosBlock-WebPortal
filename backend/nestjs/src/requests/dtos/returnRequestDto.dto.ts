import { requestStatus } from "@/shared/enums/requestStatus.enum";
import { Request } from "@/requests/domain/entities/request.entity";
import {
  IsString,
  IsBoolean,
  IsArray,
  ValidateIf,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsNumber,
  IsDate,
} from "class-validator";

export class ReturnRequestDto {
  @IsString()
  @IsNotEmpty()
  requestHash: string;

  @IsEnum(() => requestStatus)
  @IsNotEmpty()
  requestStatus: requestStatus;

  @IsNumber()
  @IsNotEmpty()
  timesRequested: number;

  @IsDate()
  @IsNotEmpty()
  updatedAt: Date;

  @IsString()
  @IsNotEmpty()
  variableName: string;

  @IsArray()
  @IsNotEmpty()
  @IsString({ each: true })
  pressureLevels: string[];

  @IsArray()
  @IsNotEmpty()
  @IsString({ each: true })
  years: string[];

  @IsArray()
  @IsNotEmpty()
  @IsString({ each: true })
  months: string[];

  @IsArray()
  @IsNotEmpty()
  @IsString({ each: true })
  days: string[];

  @IsArray()
  @IsNotEmpty()
  @IsString({ each: true })
  hours: string[];

  @IsArray()
  @IsNotEmpty()
  @IsString({ each: true })
  areaCovered: string[];

  @IsArray()
  @IsNotEmpty()
  @IsString({ each: true })
  mapTypes: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  mapLevels?: string[];

  @IsString()
  @IsOptional()
  fileFormat?: string;

  @IsBoolean()
  @IsOptional()
  noData?: boolean;

  @IsBoolean()
  @IsOptional()
  noMaps?: boolean;

  @IsBoolean()
  @IsOptional()
  omp?: boolean;

  @IsBoolean()
  @IsOptional()
  mpi?: boolean;
}

export function fromRequestToReturnRequest(request: Request): ReturnRequestDto {
  const dto = new ReturnRequestDto();

  dto.variableName = request.variableName;
  dto.pressureLevels = request.pressureLevels;
  dto.years = request.years;
  dto.months = request.months;
  dto.days = request.days;
  dto.hours = request.hours;
  dto.areaCovered = request.areaCovered;
  dto.mapTypes = request.mapTypes;
  dto.mapLevels = request.mapLevels || [];
  dto.fileFormat = request.fileFormat;
  dto.noData = request.noData || false;
  dto.noMaps = request.noMaps || false;
  dto.omp = request.omp || false;
  dto.mpi = request.mpi || false;
  dto.requestHash = request.requestHash;
  dto.requestStatus = request.requestStatus;
  dto.timesRequested = request.timesRequested || 0;
  dto.updatedAt = request.updatedAt || new Date();

  return dto;
}
