import { ValidationPipe, BadRequestException, Logger } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { MicroserviceOptions, Transport } from "@nestjs/microservices";
import { ConfigService } from "@nestjs/config";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import "module-alias/register";
import { HttpExceptionFilter } from "@/shared/filters/http-exception.filter";
import { AppModule } from "./app.module";

async function bootstrap() {
  const logger = new Logger("Bootstrap");
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      stopAtFirstError: false,
      exceptionFactory: errors => {
        return new BadRequestException({
          statusCode: 400,
          message: "Validation failed",
          errors: errors,
        });
      },
    })
  );

  // Global filters
  app.useGlobalFilters(new HttpExceptionFilter());

  // Enable CORS
  app.enableCors();

  // Global prefix
  app.setGlobalPrefix("api");

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle("NestJS API")
    .setDescription("The NestJS API description")
    .setVersion("1.0")
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("api/docs", app, document);

  // Connect to RabbitMQ for config queue (outgoing messages)
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: [configService.get<string>("RABBITMQ_URL") ?? "amqp://admin:pass@localhost:5672"],
      queue: configService.get<string>("RABBITMQ_CONFIG_QUEUE") ?? "config_queue",
      queueOptions: { durable: true },
      noAck: false,
      prefetchCount: 1,
    },
  });

  // Connect to RabbitMQ for result queue (incoming messages)
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: [configService.get<string>("RABBITMQ_URL") ?? "amqp://admin:pass@localhost:5672"],
      queue: configService.get<string>("RABBITMQ_RESULTS_QUEUE") ?? "results_queue",
      queueOptions: { durable: true },
      noAck: false,
      prefetchCount: 1,
    },
  });

  // Handle graceful shutdown
  const signals = ["SIGTERM", "SIGINT"];

  signals.forEach(signal => {
    process.on(signal, async () => {
      logger.log(`Received ${signal} signal - shutting down gracefully`);

      await app.close();
      logger.log("Application closed");

      process.exit(0);
    });
  });

  await app.startAllMicroservices();
  const port = configService.get<number>("PORT") ?? 3000;
  await app.listen(port);

  logger.log(`🚀 Application is running on: ${await app.getUrl()}`);
  logger.log(`📝 Swagger documentation available at: ${await app.getUrl()}/api/docs`);
}
bootstrap();
