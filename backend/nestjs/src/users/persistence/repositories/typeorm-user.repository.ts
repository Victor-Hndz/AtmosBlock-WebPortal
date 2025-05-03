import { Injectable, NotFoundException, ConflictException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { UserEntity } from "../entities/user.entity";
import { User } from "../../domain/entities/user.entity";
import { IUserRepository } from "../../domain/repositories/user.repository.interface";
import { UserMapper } from "../mappers/user.mapper";

@Injectable()
export class TypeOrmUserRepository implements IUserRepository {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>
  ) {}

  async findAll(): Promise<User[]> {
    const userEntities = await this.userRepository.find();
    return userEntities.map(UserMapper.toDomain);
  }

  async findOne(id: string): Promise<User> {
    const userEntity = await this.userRepository.findOneBy({ id });
    if (!userEntity) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return UserMapper.toDomain(userEntity);
  }

  async findByEmail(email: string): Promise<User | null> {
    const userEntity = await this.userRepository.findOneBy({ email });
    return userEntity ? UserMapper.toDomain(userEntity) : null;
  }

  async create(user: User, plainPassword: string): Promise<User> {
    const existingUser = await this.userRepository.findOneBy({ email: user.email });
    if (existingUser) {
      throw new ConflictException("Email already in use");
    }

    // Set and hash password
    await user.setPassword(plainPassword);

    const userEntity = UserMapper.toPersistence(user);
    const savedEntity = await this.userRepository.save(userEntity);

    return UserMapper.toDomain(savedEntity);
  }

  async update(user: User): Promise<User> {
    const existingEntity = await this.userRepository.findOneBy({ id: user.id });
    if (!existingEntity) {
      throw new NotFoundException(`User with ID ${user.id} not found`);
    }

    if (user.email !== existingEntity.email) {
      const emailInUse = await this.userRepository.findOneBy({ email: user.email });
      if (emailInUse && emailInUse.id !== user.id) {
        throw new ConflictException("Email already in use");
      }
    }

    if (user.shouldRehashPassword()) {
      await user.setPassword(user.password);
    }

    const updatedEntity = UserMapper.toPersistence(user, existingEntity);
    const savedEntity = await this.userRepository.save(updatedEntity);

    return UserMapper.toDomain(savedEntity);
  }

  async remove(id: string): Promise<void> {
    const userEntity = await this.userRepository.findOneBy({ id });
    if (!userEntity) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    await this.userRepository.remove(userEntity);
  }

  async findOneWithRequests(id: string): Promise<User> {
    const userEntity = await this.userRepository.findOne({
      where: { id },
      relations: ["requests"],
    });

    if (!userEntity) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return UserMapper.toDomain(userEntity);
  }
}
