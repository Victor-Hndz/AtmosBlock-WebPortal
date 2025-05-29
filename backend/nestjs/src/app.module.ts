import { Module } from "@nestjs/common";
import { UsersModule } from "./users/users.module";
import { RequestsModule } from "./requests/requests.module";
import { AuthModule } from "./auth/auth.module";
import { ConfigModule } from "./config/config.module";
import { DatabaseModule } from "./database/database.module";
import { GeneratedFilesModule } from "./generatedFiles/generatedFiles.module";
import { MinioModule } from "./minio/minio.module";
import { ProgressModule } from "./progress/progress.module";
import { RabbitMQModule } from "./shared/messaging/rabbitmq.module";

@Module({
  imports: [
    ConfigModule,
    DatabaseModule,
    UsersModule,
    RequestsModule,
    AuthModule,
    GeneratedFilesModule,
    ProgressModule,
    RabbitMQModule,
    MinioModule,
  ],
})
export class AppModule {}
