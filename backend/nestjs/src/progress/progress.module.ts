import { Module } from "@nestjs/common";
import { ProgressService } from "./services/progress.service";
import { ProgressController } from "./controllers/progress.controller";
import { ProgressConsumer } from "./messaging/progress.consumer";
import { ProgressUpdatesController } from "./controllers/progressUpdates.controller";
import { RabbitMQModule } from "@/shared/messaging/rabbitmq.module";

@Module({
  imports: [RabbitMQModule],
  providers: [ProgressService, ProgressConsumer],
  controllers: [ProgressController, ProgressUpdatesController],
  exports: [ProgressService],
})
export class ProgressModule {}
