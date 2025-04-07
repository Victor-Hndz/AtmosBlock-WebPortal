import { Injectable, NotFoundException, ConflictException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { User, UserRole } from "../entities/user.entity";
import { CreateUserDto } from "../dtos/create-user.dto";
import { UpdateUserDto } from "../dtos/update-user.dto";
import { UpdateProfileDto } from "../dtos/update-profile.dto";

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>
  ) {}

  async findAll(): Promise<User[]> {
    return this.userRepository.find();
  }

  async findOne(id: string): Promise<User> {
    const user = await this.userRepository.findOneBy({ id });
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOneBy({ email });
  }

  async create(createUserDto: CreateUserDto): Promise<User> {
    const existingUser = await this.findByEmail(createUserDto.email);
    if (existingUser) {
      throw new ConflictException("Email already in use");
    }

    const user = this.userRepository.create();
    // Set basic properties
    user.name = createUserDto.name;
    user.email = createUserDto.email;
    user.role = createUserDto.role ?? UserRole.USER;

    // Set password properly to trigger the password change flag
    user.setPassword(createUserDto.password);

    return this.userRepository.save(user);
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.findOne(id);

    if (updateUserDto.email && updateUserDto.email !== user.email) {
      const existingUser = await this.findByEmail(updateUserDto.email);
      if (existingUser) {
        throw new ConflictException("Email already in use");
      }
    }

    // Handle password updates properly using the new setPassword method
    if (updateUserDto.password) {
      user.setPassword(updateUserDto.password);
      delete updateUserDto.password; // Remove password from DTO to prevent double assignment
    }

    // Assign remaining properties
    Object.assign(user, updateUserDto);

    return this.userRepository.save(user);
  }

  async remove(id: string): Promise<void> {
    const user = await this.findOne(id);
    await this.userRepository.remove(user);
  }

  async findOneWithRequests(id: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: ["requests"],
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    // Remove password from the returned object
    const { password, ...result } = user;
    return result as User;
  }

  async updateProfile(id: string, updateProfileDto: UpdateProfileDto): Promise<User> {
    const user = await this.findOne(id);

    if (updateProfileDto.email && updateProfileDto.email !== user.email) {
      const existingUser = await this.findByEmail(updateProfileDto.email);
      if (existingUser) {
        throw new ConflictException("Email already in use");
      }
    }

    // Update only the provided fields without affecting the password
    // Since UpdateProfileDto doesn't include password, this won't modify the password
    Object.assign(user, updateProfileDto);

    await this.userRepository.save(user);

    // Remove password from the returned object
    const { password, ...result } = user;
    return result as User;
  }
}
