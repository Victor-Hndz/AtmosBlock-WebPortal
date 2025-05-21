import { Module } from "@nestjs/common";
import { ConfigModule as NestConfigModule } from "@nestjs/config";
import * as Joi from 'joi';

@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ".env",
      validationSchema: Joi.object({
        NODE_ENV: Joi.string().valid("development", "production", "test").default("development"),
        PORT: Joi.number().default(3000),
        // Database
        DB_HOST: Joi.string().required(),
        DB_PORT: Joi.number().required(),
        DB_USERNAME: Joi.string().required(),
        DB_PASSWORD: Joi.string().required(),
        DB_NAME: Joi.string().required(),
        // JWT
        JWT_SECRET: Joi.string().required(),
        JWT_EXPIRATION: Joi.string().required(),
        // RabbitMQ
        RABBITMQ_URL: Joi.string().required(),
        RABBITMQ_CONFIG_QUEUE: Joi.string().required(),
        RABBITMQ_RESULT_QUEUE: Joi.string().required(),
        RABBITMQ_PROGRESS_QUEUE: Joi.string().default("progress_queue"),
        //MINIO
        MINIO_ENDPOINT: Joi.string().required(),
        MINIO_HOST: Joi.string().required(),
        MINIO_PORT: Joi.number().required(),
        MINIO_USER: Joi.string().required(),
        MINIO_PASSWORD: Joi.string().required(),
        MINIO_BUCKET: Joi.string().required(),
      }),
    }),
  ],
})
export class ConfigModule {}
