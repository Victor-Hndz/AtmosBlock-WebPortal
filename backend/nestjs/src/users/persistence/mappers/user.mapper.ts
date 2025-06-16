import { RequestMapper } from "@/requests/persistence/mappers/request.mapper";
import { User } from "@/users/domain/entities/user.entity";
import { UserEntity } from "@/users/persistence/entities/user.entity";

/**
 * User mapper - translates between domain and persistence entities
 */
export class UserMapper {
  /**
   * Maps a persistence entity to a domain entity
   * @param entity The entity to map
   * @param includeRequests Whether to include full request objects (default: false)
   */
  static toDomain(entity: UserEntity, includeRequests: boolean = false): User {
    return new User({
      id: entity.id,
      name: entity.name,
      email: entity.email,
      password: entity.password,
      role: entity.role,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
      // Only map requests if specifically requested and they exist
      requests:
        includeRequests && entity.requests
          ? entity.requests.map(req => {
              return RequestMapper.toDomain(req);
            })
          : undefined,
    });
  }

  /**
   * Maps a domain entity to a persistence entity
   * @param domain The domain entity to map
   * @param includeRequests Whether to include full request objects (default: false)
   */
  static toPersistence(domain: User, includeRequests: boolean = false): UserEntity {
    const entity = new UserEntity();
    entity.id = domain.id;
    entity.name = domain.name;
    entity.email = domain.email;
    entity.password = domain.password;
    entity.role = domain.role;

    // Only map requests if specifically requested and they exist
    if (includeRequests && domain.requests && domain.requests.length > 0) {
      entity.requests = domain.requests.map(req => {
        return RequestMapper.toPersistence(req);
      });
    }

    return entity;
  }
}
