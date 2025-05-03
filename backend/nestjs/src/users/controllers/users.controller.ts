import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request } from "@nestjs/common";
import { UsersService } from "../services/users.service";
import { CreateUserDto } from "../dtos/create-user.dto";
import { UpdateUserDto } from "../dtos/update-user.dto";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../../auth/guards/roles.guard";
import { Roles } from "../../auth/decorators/roles.decorator";
import { UserRole } from "src/shared/enums/userRoleEnum.enum";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from "@nestjs/swagger";
import { UpdateProfileDto } from "../dtos/update-profile.dto";
import { AuthService } from "../../auth/services/auth.service";

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
  getProfile(@Request() req) {
    return this.usersService.findOneWithRequests(req.user.id);
  }

  @Patch("profile")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Update own profile" })
  @ApiResponse({ status: 200, description: "The profile has been successfully updated." })
  @ApiResponse({ status: 409, description: "Email already in use." })
  async updateProfile(@Request() req, @Body() updateProfileDto: UpdateProfileDto) {
    // Update the user profile
    const updatedUser = await this.usersService.updateProfile(req.user.id, updateProfileDto);

    // If email was updated, we need to generate a new token
    if (updateProfileDto.email && updateProfileDto.email !== req.user.email) {
      // Create a payload for the JWT token
      const payload = {
        sub: updatedUser.id,
        email: updatedUser.email,
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
  removeProfile(@Request() req) {
    return this.usersService.remove(req.user.id);
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
