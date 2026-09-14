import { Module } from "@nestjs/common";
import { ProgressService } from "./services/progress.service";
import { ProgressController } from "./controllers/progress.controller";
import { ProgressConsumer } from "./messaging/progress.consumer";
import { ProgressUpdatesController } from "./controllers/progressUpdates.controller";
import { RabbitMQModule } from "@/shared/messaging/rabbitmq.module";
import { UsersModule } from "@/users/users.module";

@Module({
  imports: [RabbitMQModule, UsersModule],
  providers: [ProgressService, ProgressConsumer],
  controllers: [ProgressController, ProgressUpdatesController],
  exports: [ProgressService],
})
export class ProgressModule {}
