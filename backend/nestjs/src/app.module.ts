import { Module } from "@nestjs/common";
import { ClientsModule, Transport } from "@nestjs/microservices";
import { UsersModule } from "./users/users.module";
import { RequestsModule } from "./requests/requests.module";
import { GeneratedFiles } from "./generatedFiles/entities/generatedFiles.entity";
import { AuthModule } from "./auth/auth.module";
import { ConfigModule } from "./config/config.module";
import { DatabaseModule } from "./database/database.module";

@Module({
  imports: [
    ConfigModule,
    DatabaseModule,
    UsersModule,
    RequestsModule,
    AuthModule,
    GeneratedFiles,
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
})
export class AppModule {}
