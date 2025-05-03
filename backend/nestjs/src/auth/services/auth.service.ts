import { Injectable, UnauthorizedException, ConflictException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { UserRole } from "@/shared/enums/userRoleEnum.enum";
import { UsersService } from "@/users/services/users.service";
import { LoginDto } from "@/auth/dtos/login.dto";
import { RegisterDto } from "@/auth/dtos/register.dto";
import { CreateUserDto } from "@/users/dtos/create-user.dto";

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService
  ) {}

  async login(loginDto: LoginDto) {
    const user = await this.usersService.findByEmail(loginDto.email);

    if (!user) {
      throw new UnauthorizedException("Invalid credentials");
    }

    const isPasswordValid = await user.validatePassword(loginDto.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException("Invalid credentials");
    }

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      accessToken: this.jwtService.sign(payload),
    };
  }

  async register(registerDto: RegisterDto) {
    try {
      const createUserDto: CreateUserDto = {
        name: registerDto.name,
        email: registerDto.email,
        password: registerDto.password,
        role: UserRole.USER,
      };

      const user = await this.usersService.create(createUserDto);

      const payload = {
        sub: user.id,
        email: user.email,
        role: user.role,
      };

      return {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
        accessToken: this.jwtService.sign(payload),
      };
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }
      throw new Error("Registration failed");
    }
  }

  /**
   * Generates a JWT token for a user with the given payload
   * @param payload The payload to include in the JWT token
   * @returns The signed JWT token
   */
  generateToken(payload: { sub: string; email: string; role: string }): string {
    return this.jwtService.sign(payload);
  }

  validateToken(token: string) {
    try {
      return this.jwtService.verify(token);
    } catch (error) {
      throw new UnauthorizedException("Invalid token: " + error.message);
    }
  }
}
