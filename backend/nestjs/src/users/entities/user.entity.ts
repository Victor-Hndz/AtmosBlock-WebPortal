import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  BeforeInsert,
  BeforeUpdate,
  OneToMany,
} from "typeorm";
import * as bcrypt from "bcrypt";
import { Request } from "../../requests/entities/request.entity";

export enum UserRole {
  ADMIN = "admin",
  USER = "user",
}

@Entity("users")
export class User {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ length: 100 })
  name: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  @Column({
    type: "enum",
    enum: UserRole,
    default: UserRole.USER,
  })
  role: UserRole;

  @Column({ name: "is_active", default: true })
  isActive: boolean;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;

  @OneToMany(() => Request, request => request.user)
  requests: Request[];

  @BeforeInsert()
  @BeforeUpdate()
  async hashPassword() {
    // Only hash the password if it has been modified
    // This prevents password re-hashing when updating other fields
    if (this.password && this.__has_password_changed__) {
      this.password = await bcrypt.hash(this.password, 10);
      this.__has_password_changed__ = false;
    }
  }

  // Property to track if password has changed
  private __has_password_changed__: boolean = false;

  // Method to call when setting a new password
  setPassword(password: string): void {
    this.password = password;
    this.__has_password_changed__ = true;
  }

  async validatePassword(password: string): Promise<boolean> {
    return bcrypt.compare(password, this.password);
  }
}
