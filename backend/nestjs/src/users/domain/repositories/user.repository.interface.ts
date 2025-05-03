import { User } from "../entities/user.entity";

/**
 * User repository interface - defines the contract for user repository implementations
 */
export interface IUserRepository {
  findAll(): Promise<User[]>;
  findOne(id: string): Promise<User>;
  findByEmail(email: string): Promise<User | null>;
  create(user: User, password: string): Promise<User>;
  update(user: User): Promise<User>;
  remove(id: string): Promise<void>;
  findOneWithRequests(id: string): Promise<User>;
}
