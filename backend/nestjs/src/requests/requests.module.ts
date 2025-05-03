import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ClientsModule, Transport } from "@nestjs/microservices";
import { RequestsService } from "./services/requests.service";
import { RequestsController } from "./controllers/requests.controller";
import { RequestsPublisher } from "./messaging/requests.publisher";
import { RequestsConsumer } from "./messaging/requests.consumer";
import { RequestEntity } from "./persistence/entities/request.entity";
import { GeneratedFilesModule } from "@/generatedFiles/generatedFiles.module";
import { TypeOrmRequestRepository } from "./persistence/repositories/typeorm-request.repository";

@Module({
  imports: [
    TypeOrmModule.forFeature([RequestEntity]),
    GeneratedFilesModule,
    ClientsModule.register([
      {
        name: "RABBITMQ_SERVICE",
        transport: Transport.RMQ,
        options: {
          urls: [process.env.RABBITMQ_URL ?? "amqp://admin:pass@localhost:5672"],
          queue: process.env.RABBITMQ_QUEUE ?? "config_queue",
          queueOptions: {
            durable: true,
          },
        },
      },
    ]),
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
