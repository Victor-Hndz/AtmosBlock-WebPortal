import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from "@nestjs/swagger";
import { CurrentUser } from "@/shared/decorators/currentUserDecorator.decorator";
import { JwtPayload } from "@/shared/interfaces/jwtPayloadInterface.interface";
import { UserRole } from "@/shared/enums/userRoleEnum.enum";
import { JwtAuthGuard } from "@/auth/guards/jwt-auth.guard";
import { RolesGuard } from "@/auth/guards/roles.guard";
import { AuthService } from "@/auth/services/auth.service";
import { Roles } from "@/auth/decorators/roles.decorator";
import { UsersService } from "@/users/services/users.service";
import { CreateUserDto } from "@/users/dtos/create-user.dto";
import { UpdateUserDto } from "@/users/dtos/update-user.dto";
import { UpdateProfileDto } from "@/users/dtos/update-profile.dto";

@ApiTags("users")
@ApiBearerAuth()
@Controller("users")
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly authService: AuthService
  ) {}

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: "Get all users" })
  @ApiResponse({ status: 200, description: "Return all users." })
  findAll() {
    return this.usersService.findAll();
  }

  @Get("profile")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Get user profile with requests" })
  @ApiResponse({ status: 200, description: "Return the user profile with associated requests." })
  getProfile(@CurrentUser("id") userId: string) {
    return this.usersService.findOneWithRequests(userId);
  }

  @Patch("profile")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Update own profile" })
  @ApiResponse({ status: 200, description: "The profile has been successfully updated." })
  @ApiResponse({ status: 409, description: "Email already in use." })
  async updateProfile(@CurrentUser() user: JwtPayload, @Body() updateProfileDto: UpdateProfileDto) {
    // Update the user profile
    const updatedUser = await this.usersService.updateProfile(user.id, updateProfileDto);

    // If email was updated, we need to generate a new token
    if (updateProfileDto.email && updateProfileDto.email !== user.email) {
      // Create a payload for the JWT token
      const payload = {
        sub: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        role: updatedUser.role,
      };

      // Generate a new token and return both the updated user and the new token
      return {
        user: updatedUser,
        accessToken: this.authService.generateToken(payload),
      };
    }

    // If email wasn't changed, just return the updated user
    return { user: updatedUser };
  }

  @Delete("profile")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Delete own account" })
  @ApiResponse({ status: 200, description: "The account has been successfully deleted." })
  removeProfile(@CurrentUser("id") userId: string) {
    return this.usersService.remove(userId);
  }

  @Get(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: "Get user by id" })
  @ApiResponse({ status: 200, description: "Return the user." })
  @ApiResponse({ status: 404, description: "User not found." })
  findOne(@Param("id") id: string) {
    return this.usersService.findOne(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: "Create user" })
  @ApiResponse({ status: 201, description: "The user has been successfully created." })
  @ApiResponse({ status: 409, description: "Email already in use." })
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Patch(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: "Update user" })
  @ApiResponse({ status: 200, description: "The user has been successfully updated." })
  @ApiResponse({ status: 404, description: "User not found." })
  update(@Param("id") id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(id, updateUserDto);
  }

  @Delete(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: "Delete user" })
  @ApiResponse({ status: 200, description: "The user has been successfully deleted." })
  @ApiResponse({ status: 404, description: "User not found." })
  remove(@Param("id") id: string) {
    return this.usersService.remove(id);
  }
}
