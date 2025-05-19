import { ValidationPipe, BadRequestException, Logger } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
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
  // No need to connect microservices as we're using direct AMQP connections now

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
  const port = configService.get<number>("PORT") ?? 3000;
  await app.listen(port);

  logger.log(`🚀 Application is running on: ${await app.getUrl()}`);
  logger.log(`📝 Swagger documentation available at: ${await app.getUrl()}/api/docs`);
}
bootstrap();
