import { Module } from "@nestjs/common";
import { ClientsModule, Transport } from "@nestjs/microservices";
import { UsersModule } from "./users/users.module";
import { RequestsModule } from "./requests/requests.module";
import { AuthModule } from "./auth/auth.module";
import { ConfigModule } from "./config/config.module";
import { DatabaseModule } from "./database/database.module";
import { GeneratedFilesModule } from "./generatedFiles/generatedFiles.module";
import { MinioModule } from "./minio/minio.module";
import { ProgressModule } from "./progress/progress.module";

@Module({
  imports: [
    ConfigModule,
    DatabaseModule,
    UsersModule,
    RequestsModule,
    MinioModule,
    AuthModule,
    GeneratedFilesModule,
    ProgressModule,
    ClientsModule.register([
      {
        name: "RABBITMQ_CONFIG_SERVICE",
        transport: Transport.RMQ,
        options: {
          urls: [process.env.RABBITMQ_URL ?? "amqp://admin:pass@localhost:5672"],
          queue: process.env.RABBITMQ_CONFIG_QUEUE ?? "config_queue",
          queueOptions: {
            durable: true,
          },
        },
      },
    ]),
    ClientsModule.register([
      {
        name: "RABBITMQ_RESULTS_SERVICE",
        transport: Transport.RMQ,
        options: {
          urls: [process.env.RABBITMQ_URL ?? "amqp://admin:pass@localhost:5672"],
          queue: process.env.RABBITMQ_RESULTS_QUEUE ?? "results_queue",
          queueOptions: {
            durable: true,
          },
        },
      },
    ]),
    ClientsModule.register([
      {
        name: "RABBITMQ_PROGRESS_SERVICE",
        transport: Transport.RMQ,
        options: {
          urls: [process.env.RABBITMQ_URL ?? "amqp://admin:pass@localhost:5672"],
          queue: process.env.RABBITMQ_PROGRESS_QUEUE ?? "progress_queue",
          queueOptions: {
            durable: true,
          },
        },
      },
    ]),
  ],
})
export class AppModule {}
