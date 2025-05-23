import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from "typeorm";
import { RequestEntity } from "@/requests/persistence/entities/request.entity";

@Entity("generated_files")
export class GeneratedFilesEntity {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ name: "request_hash" })
  requestHash: string;

  @Column("text", { array: true, default: [] })
  files: string[];

  @Column({ type: "enum", enum: ["pending", "processing", "complete", "error"], default: "pending" })
  status: string;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;

  @Column({ name: "generated_at", type: "timestamp with time zone", nullable: true })
  generatedAt: Date;

  @Column({ name: "expires_at", type: "timestamp with time zone", nullable: true })
  expiresAt: Date;

  @OneToMany(() => RequestEntity, request => request.generatedFiles, { nullable: true })
  requests?: RequestEntity[];
}
