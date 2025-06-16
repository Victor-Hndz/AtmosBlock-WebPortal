import { Injectable, Inject } from "@nestjs/common";
import { User } from "@/users/domain/entities/user.entity";
import { IUserRepository } from "@/users/domain/repositories/user.repository.interface";
import { CreateUserDto } from "@/users/dtos/create-user.dto";
import { UpdateUserDto } from "@/users/dtos/update-user.dto";
import { UpdateProfileDto } from "@/users/dtos/update-profile.dto";

@Injectable()
export class UsersService {
  constructor(
    @Inject("IUserRepository")
    private readonly userRepository: IUserRepository
  ) {}

  async findAll(): Promise<User[]> {
    return this.userRepository.findAll();
  }

  async findOne(id: string): Promise<User> {
    return this.userRepository.findOne(id);
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findByEmail(email);
  }

  async create(createUserDto: CreateUserDto): Promise<User> {
    const user = new User({
      name: createUserDto.name,
      email: createUserDto.email,
      role: createUserDto.role,
    });

    return this.userRepository.create(user, createUserDto.password);
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.userRepository.findOne(id);

    // Update properties if provided
    if (updateUserDto.name) user.name = updateUserDto.name;
    if (updateUserDto.email) user.email = updateUserDto.email;
    if (updateUserDto.role) user.updateRole(updateUserDto.role);
    // Special handling for password
    let updatedUser = await this.userRepository.update(user);

    if (updateUserDto.password) {
      updatedUser.setPassword(updateUserDto.password);
      updatedUser = await this.userRepository.update(updatedUser);
    }

    return updatedUser;
  }

  async updateRequests(existingUser: User): Promise<User> {
    return this.userRepository.update(existingUser);
  }

  async remove(id: string): Promise<void> {
    return this.userRepository.remove(id);
  }

  async findOneWithRequests(id: string): Promise<User> {
    return this.userRepository.findOneWithRequests(id);
  }

  async getRequestHashesByUserId(userId: string): Promise<string[]> {
    const user = await this.userRepository.findOneWithRequests(userId);

    if (!user) {
      throw new Error(`User with ID ${userId} not found`);
    }
    if (!user.requests || user.requests.length === 0) {
      return [];
    }
    return user.requests.map(request => request.requestHash);
  }

  async updateProfile(id: string, updateProfileDto: UpdateProfileDto): Promise<User> {
    const user = await this.userRepository.findOne(id);

    // Use domain method to update profile
    user.updateProfile(updateProfileDto.name ?? user.name, updateProfileDto.email ?? user.email);

    return this.userRepository.update(user);
  }
}
