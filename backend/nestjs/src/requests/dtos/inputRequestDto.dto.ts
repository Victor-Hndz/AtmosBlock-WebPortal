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
  @IsNotEmpty()
  @IsString({ each: true })
  mapRanges: string[];

  @IsArray()
  @IsNotEmpty()
  @IsString({ each: true })
  mapLevels: string[];

  @IsArray()
  @IsString({ each: true })
  @ValidateIf(o => o.allTimeInstants !== true)
  @IsNotEmpty({ message: "At least one timeInstant must be provided if allTimeInstants is not true" })
  timeInstants?: string[];

  @ValidateIf(o => !o.timeInstants || o.timeInstants.length == 0)
  @IsBoolean({ message: "allTimeInstants cannot be true if timeInstants is provided" })
  @IsNotEmpty({ message: "allTimeInstants must be true if no timeInstants are provided" })
  allTimeInstants?: boolean;

  @IsString()
  @IsOptional()
  fileFormat?: boolean;

  @IsString()
  @IsOptional()
  outDir?: string;

  @IsBoolean()
  @IsOptional()
  tracking?: boolean;

  @IsBoolean()
  @IsOptional()
  debug?: boolean;

  @IsBoolean()
  @IsOptional()
  noCompile?: boolean;

  @IsBoolean()
  @IsOptional()
  noExecute?: boolean;

  @IsBoolean()
  @IsOptional()
  noMaps?: boolean;

  @IsBoolean()
  @IsOptional()
  animation?: boolean;

  @IsBoolean()
  @IsOptional()
  omp?: boolean;

  @IsBoolean()
  @IsOptional()
  mpi?: boolean;

  @ValidateIf(o => o.omp === true)
  @IsBoolean()
  @IsOptional()
  n_threads?: boolean;

  @ValidateIf(o => o.mpi === true)
  @IsBoolean()
  @IsOptional()
  n_process?: boolean;
}
