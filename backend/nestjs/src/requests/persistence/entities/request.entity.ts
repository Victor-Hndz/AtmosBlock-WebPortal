import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  UpdateDateColumn,
} from "typeorm";
import { GeneratedFilesEntity } from "@/generatedFiles/persistence/entities/generatedFiles.entity";
import { UserEntity } from "@/users/persistence/entities/user.entity";
import { requestStatus } from "@/shared/enums/requestStatus.enum";

/**
 * Request persistence entity - represents a request in the database
 * This is the entity used by TypeORM for database operations
 */
@Entity("requests")
export class RequestEntity {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ name: "request_hash" })
  requestHash: string;

  @Column({ name: "request_status", type: "enum", enum: requestStatus, default: requestStatus.EMPTY })
  requestStatus: requestStatus;

  @Column({ name: "variable_name" })
  variableName: string;

  @Column("text", { array: true, name: "pressure_levels" })
  pressureLevels: string[];

  @Column("text", { array: true, name: "years_selected" })
  years: string[];

  @Column("text", { array: true, name: "months_selected" })
  months: string[];

  @Column("text", { array: true, name: "days_selected" })
  days: string[];

  @Column("text", { array: true, name: "hours_selected" })
  hours: string[];

  @Column("text", { array: true, name: "area_covered" })
  areaCovered: string[];

  @Column("text", { array: true, name: "map_ranges" })
  mapRanges: string[];

  @Column("text", { array: true, name: "map_types" })
  mapTypes: string[];

  @Column("text", { nullable: true, array: true, name: "map_levels", default: ["20"] })
  mapLevels?: string[];

  @Column({ nullable: true, name: "file_format_selected" })
  fileFormat?: string;

  @Column({ default: false })
  tracking: boolean;

  @Column({ default: false, name: "no_compile" })
  noCompile: boolean;

  @Column({ default: false, name: "no_execute" })
  noExecute: boolean;

  @Column({ default: false, name: "no_maps" })
  noMaps: boolean;

  @Column({ default: false })
  animation: boolean;

  @Column({ default: false })
  omp: boolean;

  @Column({ default: false })
  mpi: boolean;

  @Column({ nullable: true, name: "n_threads" })
  nThreads?: number;

  @Column({ nullable: true, name: "n_proces" })
  nProces?: number;

  @Column({ name: "times_requested", default: 1 })
  timesRequested: number;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;

  @ManyToOne(() => UserEntity, user => user.requests, { onDelete: "SET NULL", nullable: true })
  @JoinColumn({ name: "user_id" })
  user?: UserEntity;

  @ManyToOne(() => GeneratedFilesEntity, generatedFiles => generatedFiles.requests, {
    onDelete: "SET NULL",
    nullable: true,
  })
  @JoinColumn({ name: "generated_files_id" })
  generatedFiles: GeneratedFilesEntity;
}
