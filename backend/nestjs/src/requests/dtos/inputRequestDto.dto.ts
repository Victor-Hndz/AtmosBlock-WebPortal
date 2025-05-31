import { IsString, IsBoolean, IsArray, ValidateIf, IsNotEmpty, IsOptional } from "class-validator";

export class InputRequestDto {
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
