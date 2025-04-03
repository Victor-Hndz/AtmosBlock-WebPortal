import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ClientsModule, Transport } from "@nestjs/microservices";
import { RequestsService } from "./services/requests.service";
import { RequestsController } from "./controllers/requests.controller";
import { RequestsPublisher } from "./messaging/requests.publisher";
import { Request } from "./entities/request.entity";
import { UsersModule } from "../users/users.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([Request]),
    UsersModule,
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
  providers: [RequestsService, RequestsPublisher],
  controllers: [RequestsController],
  exports: [RequestsService],
})
export class RequestsModule {}
