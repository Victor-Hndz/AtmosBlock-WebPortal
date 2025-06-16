import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToMany,
  JoinTable,
} from "typeorm";
import { UserRole } from "@/shared/enums/userRoleEnum.enum";
import { RequestEntity } from "@/requests/persistence/entities/request.entity";

/**
 * User persistence entity - represents a user in the database
 * This is the entity used by TypeORM for database operations
 */
@Entity("users")
export class UserEntity {
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

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;

  @ManyToMany(() => RequestEntity, request => request.users)
  @JoinTable({
    name: "user_requests",
    joinColumn: { name: "user_id" },
    inverseJoinColumn: { name: "request_id" },
  })
  requests?: RequestEntity[];
}
