import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { MinioService } from "./services/minio.service";
import { FilesController } from "./controllers/files.controller";

@Module({
  imports: [ConfigModule],
  controllers: [FilesController],
  providers: [MinioService],
  exports: [MinioService],
})
export class MinioModule {}
