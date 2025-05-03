import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from "typeorm";
import { RequestEntity } from "@/requests/persistence/entities/request.entity";
import { GeneratedFilesStatusEnum } from "@/shared/enums/generatedFilesStatusEnum.enum";

@Entity("generated_files")
export class GeneratedFilesEntity {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ name: "request_hash" })
  requestHash: string;

  @Column("text", { array: true })
  files: string[];

  @Column({
    type: "enum",
    enum: GeneratedFilesStatusEnum,
    default: GeneratedFilesStatusEnum.PENDING,
  })
  status: GeneratedFilesStatusEnum;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;

  @Column({ name: "expires_at", type: "timestamp with time zone", nullable: false })
  expires_at: Date;

  @OneToMany(() => RequestEntity, request => request.generatedFiles)
  requests: RequestEntity[];
}
