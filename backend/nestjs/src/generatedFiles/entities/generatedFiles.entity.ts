import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from "typeorm";
import { Request } from "../../requests/entities/request.entity";
import { GeneratedFilesStatusEnum } from "src/shared/enums/generatedFilesStatusEnum.enum";

@Entity("generated_files")
export class GeneratedFiles {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ name: "request_hash" })
  requestHash: string;

  @Column("text", { array: true })
  files: string[];

  @Column({ name: "times_requested" })
  timesRequested: number;

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

  @UpdateDateColumn({ name: "expires_at" })
  expires_at: Date;

  @OneToMany(() => Request, request => request.generatedFiles)
  requests: Request[];
}
