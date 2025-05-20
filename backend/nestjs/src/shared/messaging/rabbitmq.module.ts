import { Module } from "@nestjs/common";
import { RabbitMQService } from "./rabbitmq.service";
import { AmqpService } from "./amqp.service";
import { AmqpConsumerService } from "./amqp-consumer.service";

@Module({
  providers: [RabbitMQService, AmqpService, AmqpConsumerService],
  exports: [RabbitMQService, AmqpService, AmqpConsumerService],
})
export class RabbitMQModule {}
