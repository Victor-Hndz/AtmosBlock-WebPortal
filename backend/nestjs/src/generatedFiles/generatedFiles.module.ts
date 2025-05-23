import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { GeneratedFilesService } from "./services/generatedFiles.service";
import { GeneratedFilesEntity } from "./persistence/entities/generatedFiles.entity";
import { TypeOrmGeneratedFilesRepository } from "./persistence/repositories/typeorm-generatedFiles.repository";
import { MinioService } from "@/minio/services/minio.service";
import { ResultsService } from "./services/results.service";
import { ResultsController } from "./controllers/results.controller";
import { ResultsConsumerController } from "./controllers/results-consumer.controller";
import { ResultsConsumer } from "./messaging/results.consumer";
import { RabbitMQModule } from "@/shared/messaging/rabbitmq.module";
import { ProgressModule } from "@/progress/progress.module";

@Module({
  imports: [TypeOrmModule.forFeature([GeneratedFilesEntity]), RabbitMQModule, ProgressModule],
  controllers: [ResultsController, ResultsConsumerController],
  providers: [
    MinioService,
    GeneratedFilesService,
    ResultsService,
    ResultsConsumer,
    {
      provide: "IGeneratedFilesRepository",
      useClass: TypeOrmGeneratedFilesRepository,
    },
  ],
  exports: [GeneratedFilesService, ResultsService],
})
export class GeneratedFilesModule {}
