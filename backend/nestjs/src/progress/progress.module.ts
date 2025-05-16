import { Module } from "@nestjs/common";
import { ClientsModule, Transport } from "@nestjs/microservices";
import { ProgressService } from "./services/progress.service";
import { ProgressController } from "./controllers/progress.controller";
import { ProgressConsumer } from "./messaging/progress.consumer";

@Module({
  imports: [
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
  providers: [ProgressService, ProgressConsumer],
  controllers: [ProgressController],
  exports: [ProgressService],
})
export class ProgressModule {}
