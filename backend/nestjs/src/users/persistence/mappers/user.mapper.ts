import { User } from "@/users/domain/entities/user.entity";
import { UserEntity } from "@/users/persistence/entities/user.entity";

/**
 * User mapper - translates between domain and persistence entities
 */
export class UserMapper {
  /**
   * Maps a persistence entity to a domain entity
   */
  static toDomain(userEntity: UserEntity): User {
    const user = new User({
      id: userEntity.id,
      name: userEntity.name,
      email: userEntity.email,
      role: userEntity.role,
      createdAt: userEntity.createdAt,
      updatedAt: userEntity.updatedAt,
      requests: userEntity.requests,
    });

    user.password = userEntity.password;
    return user;
  }

  /**
   * Maps a domain entity to a persistence entity
   */
  static toPersistence(user: User, persistenceUser?: UserEntity): UserEntity {
    persistenceUser ??= new UserEntity();

    persistenceUser.id = user.id;
    persistenceUser.name = user.name;
    persistenceUser.email = user.email;
    persistenceUser.role = user.role;
    persistenceUser.password = user.password;

    return persistenceUser;
  }
}
