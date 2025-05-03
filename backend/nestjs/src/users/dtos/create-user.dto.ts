import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";
import { UserRole } from "@/shared/enums/userRoleEnum.enum";

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ description: "User's name", example: "John Doe", required: true })
  name: string;

  @IsEmail()
  @IsNotEmpty()
  @ApiProperty({ description: "User's email", example: "example@gmail.com", required: true })
  email: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ description: "User's password", example: "password123", required: true })
  password: string;

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
