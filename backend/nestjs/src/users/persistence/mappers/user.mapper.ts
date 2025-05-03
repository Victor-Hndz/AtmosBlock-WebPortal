import { RequestMapper } from "@/requests/persistence/mappers/request.mapper";
import { User } from "@/users/domain/entities/user.entity";
import { UserEntity } from "@/users/persistence/entities/user.entity";

/**
 * User mapper - translates between domain and persistence entities
 */
export class UserMapper {
  /**
   * Maps a persistence entity to a domain entity
   */
  static toDomain(entity: UserEntity): User {
    return new User({
      id: entity.id,
      name: entity.name,
      email: entity.email,
      password: entity.password,
      role: entity.role,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
      requests: entity.requests?.map(RequestMapper.toDomain),
    });
  }

  /**
   * Maps a domain entity to a persistence entity
   */
  static toPersistence(domain: User): UserEntity {
    const entity = new UserEntity();
    entity.id = domain.id;
    entity.name = domain.name;
    entity.email = domain.email;
    entity.password = domain.password;
    entity.role = domain.role;

    return entity;
  }
}
