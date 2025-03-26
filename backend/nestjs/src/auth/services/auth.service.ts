import { Injectable, UnauthorizedException, ConflictException } from "@nestjs/common";
import { LoginDto } from "../dtos/login.dto";
import { RegisterDto } from "../dtos/register.dto";

@Injectable()
export class AuthService {
  // In a real application, you would use a database
  private users = [
    {
      id: "1",
      name: "John Doe",
      email: "john.doe@example.com",
      password: "password123", // Would be hashed in a real app
    },
  ];

  async login(loginDto: LoginDto) {
    const user = this.users.find(user => user.email === loginDto.email);

    if (!user || user.password !== loginDto.password) {
      throw new UnauthorizedException("Invalid credentials");
    }

    // In a real app, you would generate a JWT token here
    const token = "mock-jwt-token";

    const { password, ...result } = user;

    return {
      user: result,
      token,
    };
  }

  async register(registerDto: RegisterDto) {
    // Check if user already exists
    const existingUser = this.users.find(user => user.email === registerDto.email);
    if (existingUser) {
      throw new ConflictException("User with this email already exists");
    }

    // In a real app, you would hash the password and save to DB
    const newUser = {
      id: (this.users.length + 1).toString(),
      name: registerDto.name,
      email: registerDto.email,
      password: registerDto.password, // Would be hashed in a real app
    };

    this.users.push(newUser);

    // Generate token (JWT in real app)
    const token = "mock-jwt-token";

    const { password, ...result } = newUser;

    return {
      user: result,
      token,
    };
  }

  logout() {
    // In a real app with JWT, you could implement token blacklisting
    // For session-based auth, you would destroy the session
    return { success: true };
  }
}
