import "module-alias/register";
import { Logger } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { ConfigService } from "@nestjs/config";
import { AppModule } from "./app.module";
import { configureApp } from "./app.setup";

async function bootstrap() {
  const logger = new Logger("Bootstrap");
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  configureApp(app, configService);

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

  // Start the server
  const port = configService.get<number>("PORT") ?? 3000;
  await app.listen(port);

  logger.log(`🚀 Application is running on: ${await app.getUrl()}`);
  if (configService.get<string>("NODE_ENV") !== "production") {
    logger.log(`📝 Swagger documentation available at: ${await app.getUrl()}/api/docs`);
  }
}

bootstrap();
