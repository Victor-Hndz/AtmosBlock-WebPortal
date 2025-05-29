import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { GeneratedFilesService } from "./services/generatedFiles.service";
import { GeneratedFilesEntity } from "./persistence/entities/generatedFiles.entity";
import { TypeOrmGeneratedFilesRepository } from "./persistence/repositories/typeorm-generatedFiles.repository";
import { MinioService } from "@/minio/services/minio.service";
import { GeneratedFilesController } from "./controllers/generatedFiles.controller";
import { RabbitMQModule } from "@/shared/messaging/rabbitmq.module";
import { ProgressModule } from "@/progress/progress.module";

@Module({
  imports: [TypeOrmModule.forFeature([GeneratedFilesEntity]), RabbitMQModule, ProgressModule],
  controllers: [GeneratedFilesController],
  providers: [
    MinioService,
    GeneratedFilesService,
    {
      provide: "IGeneratedFilesRepository",
      useClass: TypeOrmGeneratedFilesRepository,
    },
  ],
  exports: [GeneratedFilesService],
})
export class GeneratedFilesModule {}
