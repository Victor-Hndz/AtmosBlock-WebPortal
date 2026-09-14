import { BadRequestException, INestApplication, ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import helmet from "helmet";
import { HttpExceptionFilter } from "@/shared/filters/http-exception.filter";

/**
 * Global configuration of the API, shared by main.ts and the tests
 */
export function configureApp(app: INestApplication, configService: ConfigService): void {
  const corsOrigins = (configService.get<string>("CORS_ORIGINS") ?? "")
    .split(",")
    .map(origin => origin.trim())
    .filter(Boolean);

  // Global prefix
  app.setGlobalPrefix("api");

  // WEB-203 (V13): security headers. The frontend runs on another origin and embeds result images and PDFs
  // served by the API, so resources are cross-origin and it may frame them.
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: "cross-origin" },
      contentSecurityPolicy: { directives: { frameAncestors: ["'self'", ...corsOrigins] } },
    })
  );

  // WEB-202 (V6): CORS whitelist from configuration; the API uses Bearer tokens, not cookies
  app.enableCors({
    origin: corsOrigins,
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS",
    allowedHeaders: "Content-Type, Accept, Authorization",
    credentials: false,
    preflightContinue: false,
    optionsSuccessStatus: 204,
  });

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

  // WEB-204 (V12): Swagger documentation only outside production
  if (configService.get<string>("NODE_ENV") !== "production") {
    const config = new DocumentBuilder()
      .setTitle("NestJS API")
      .setDescription("The NestJS API description")
      .setVersion("1.0")
      .addBearerAuth()
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup("api/docs", app, document);
  }
}
