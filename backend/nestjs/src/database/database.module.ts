import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { HealthController } from "./health.controller";
import { opcionesBase } from "./data-source";

export const opcionesTypeOrm = (configService: ConfigService) => ({
  ...opcionesBase,
  host: configService.get("DB_HOST"),
  port: configService.get<number>("DB_PORT"),
  username: configService.get("DB_USERNAME"),
  password: configService.get("DB_PASSWORD"),
  database: configService.get("DB_NAME"),
  migrationsRun: true,
  logging: configService.get("NODE_ENV") === "development",
  ssl: configService.get("NODE_ENV") === "production",
  autoLoadEntities: true,
  retryAttempts: 5,
  retryDelay: 3000,
});

@Module({
  controllers: [HealthController],
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: opcionesTypeOrm,
    }),
  ],
})
export class DatabaseModule {}
