import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from "typeorm";
import { Request } from "../../../requests/entities/request.entity";
import { UserRole } from "../../../shared/enums/userRoleEnum.enum";

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

  @OneToMany(() => Request, request => request.user)
  requests: Request[];
}
