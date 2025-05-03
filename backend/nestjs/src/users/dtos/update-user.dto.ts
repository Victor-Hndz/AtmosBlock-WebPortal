import { IsEmail, IsEnum, IsOptional, IsString } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";
import { UserRole } from "@/shared/enums/userRoleEnum.enum";

export class UpdateUserDto {
  @IsString()
  @IsOptional()
  @ApiProperty({ description: "User's name", example: "John Doe", required: false })
  name?: string;

  @IsEmail()
  @IsOptional()
  @ApiProperty({ description: "User's email", example: "example@gmail.com", required: true })
  email?: string;

  @IsString()
  @IsOptional()
  @ApiProperty({ description: "User's password", example: "password123", required: false })
  password?: string;

  @IsEnum(UserRole)
  @IsOptional()
  @ApiProperty({
    description: "User's role",
    enum: UserRole,
    example: UserRole.USER,
    required: false,
  })
  role?: UserRole;
}
