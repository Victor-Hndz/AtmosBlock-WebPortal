import { Module } from "@nestjs/common";
import { RequestsService } from "./services/requests.service";
import { RequestsController } from "./controllers/requests.controller";
import { RequestsPublisher } from "./messaging/requests.publisher";
import { ClientsModule, Transport } from "@nestjs/microservices";

@Module({
  imports: [
    ClientsModule.register([
      {
        name: "RABBITMQ_SERVICE",
        transport: Transport.RMQ,
        options: {
          urls: [process.env.RABBITMQ_URL ?? "amqp://admin:pass@localhost:5672"],
          queue: process.env.RABBITMQ_QUEUE ?? "config_queue",
          queueOptions: {
            durable: true, // Ensure the queue survives RabbitMQ restarts
          },
        },
      },
    ]),
  ],
  providers: [RequestsService, RequestsPublisher],
  controllers: [RequestsController],
})
export class RequestsModule {}
