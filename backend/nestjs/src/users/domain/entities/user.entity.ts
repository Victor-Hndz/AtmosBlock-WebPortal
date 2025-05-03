import * as argon2 from "argon2";
import { UserRole } from "@/shared/enums/userRoleEnum.enum";
import { Request } from "@/requests/domain/entities/request.entity";

/**
 * User domain entity - represents a user in the domain logic
 */
export class User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  password: string;
  createdAt: Date;
  updatedAt: Date;
  requests?: Request[];

  // Internal flag to detect changes
  private _passwordChanged = false;

  constructor(props: Partial<User>) {
    Object.assign(this, props);
  }

  updateProfile(name: string, email: string): void {
    this.name = name;
    this.email = email;
  }

  updateRole(role: UserRole): void {
    this.role = role;
  }

  // Domain logic for password
  async setPassword(plainPassword: string): Promise<void> {
    this.password = await argon2.hash(plainPassword);
    this._passwordChanged = false;
  }

  markPasswordChanged(): void {
    this._passwordChanged = true;
  }

  shouldRehashPassword(): boolean {
    return this._passwordChanged;
  }

  async validatePassword(plainPassword: string): Promise<boolean> {
    return argon2.verify(this.password, plainPassword);
  }
}
