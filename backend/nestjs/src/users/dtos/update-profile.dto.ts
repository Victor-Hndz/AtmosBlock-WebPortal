import { IsEmail, IsOptional, IsString } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class UpdateProfileDto {
  @ApiProperty({ description: "User's name", example: "John Doe", required: false })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ description: "User's email", example: "john.doe@example.com", required: false })
  @IsEmail()
  @IsOptional()
  email?: string;
}
