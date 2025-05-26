import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { RequestsService } from "./services/requests.service";
import { RequestsController } from "./controllers/requests.controller";
import { RequestsPublisher } from "./messaging/requests.publisher";
import { RequestsConsumer } from "./messaging/requests.consumer";
import { RequestEntity } from "./persistence/entities/request.entity";
import { GeneratedFilesModule } from "@/generatedFiles/generatedFiles.module";
import { TypeOrmRequestRepository } from "./persistence/repositories/typeorm-request.repository";
import { RabbitMQModule } from "@/shared/messaging/rabbitmq.module";
import { MinioModule } from "@/minio/minio.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([RequestEntity]),
    GeneratedFilesModule,
    RabbitMQModule,
    MinioModule,
  ],
  providers: [
    RequestsService,
    {
      provide: "IRequestRepository",
      useClass: TypeOrmRequestRepository,
    },
    RequestsPublisher,
    RequestsConsumer,
  ],
  controllers: [RequestsController],
  exports: [RequestsService],
})
export class RequestsModule {}
