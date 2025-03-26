import { Module } from "@nestjs/common";
import { ClientsModule, Transport } from "@nestjs/microservices";
import { UsersModule } from "./users/users.module";
import { UsersController } from "./users/controllers/users.controller";
import { UsersService } from "./users/services/users.service";
import { RequestsModule } from "./requests/requests.module";
import { RequestsController } from "./requests/controllers/requests.controller";
import { RequestsService } from "./requests/services/requests.service";
import { RequestsPublisher } from "./requests/messaging/requests.publisher";
import { AuthModule } from "./auth/auth.module";

@Module({
  imports: [
    UsersModule,
    RequestsModule,
    AuthModule,
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
  controllers: [UsersController, RequestsController],
  providers: [UsersService, RequestsService, RequestsPublisher],
})
export class AppModule {}
