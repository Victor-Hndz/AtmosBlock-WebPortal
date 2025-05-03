import { Module } from "@nestjs/common";
import { ClientsModule, Transport } from "@nestjs/microservices";
import { UsersModule } from "./users/users.module";
import { RequestsModule } from "./requests/requests.module";
import { AuthModule } from "./auth/auth.module";
import { ConfigModule } from "./config/config.module";
import { DatabaseModule } from "./database/database.module";
import { GeneratedFilesModule } from "./generatedFiles/generatedFiles.module";
import { MinioModule } from "./minio/minio.module";

@Module({
  imports: [
    ConfigModule,
    DatabaseModule,
    UsersModule,
    RequestsModule,
    MinioModule,
    AuthModule,
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
})
export class AppModule {}
