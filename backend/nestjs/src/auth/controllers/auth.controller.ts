import { Body, Controller, HttpCode, HttpStatus, Post } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { AuthService } from "@/auth/services/auth.service";
import { LoginDto } from "@/auth/dtos/login.dto";
import { RegisterDto } from "@/auth/dtos/register.dto";

@ApiTags("auth")
@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("login")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "User login" })
  @ApiResponse({ status: 200, description: "Login successful." })
  @ApiResponse({ status: 401, description: "Invalid credentials." })
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post("register")
  @ApiOperation({ summary: "User registration" })
  @ApiResponse({ status: 201, description: "User registered successfully." })
  @ApiResponse({ status: 409, description: "Email already in use." })
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }
}
