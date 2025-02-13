import { Module } from "@nestjs/common";
import { ClientsModule, Transport } from "@nestjs/microservices";
import { ConfigService } from "@nestjs/config";

@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        name: "RABBITMQ_SERVICE",
        inject: [ConfigService],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.RMQ,
          options: {
            urls: [process.env.RABBITMQ_URL!],
            queueOptions: { durable: true },
          },
          exchange: "requests", // Nombre del exchange
          routingKey: "config.create", // Nombre de la routing key
        }),
      },
    ]),
  ],
  exports: ["RABBITMQ_SERVICE"],
})
export class RabbitMQModule {}
