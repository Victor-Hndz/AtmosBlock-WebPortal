import { Module } from "@nestjs/common";
import { MinioService } from "./services/minio.service";

@Module({
  providers: [MinioService],
  exports: [MinioService],
})
export class MinioModule {}
