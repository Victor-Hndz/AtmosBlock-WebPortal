import { Client } from "minio";
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class MinioService {
  private readonly client: Client;
  private readonly configService: ConfigService;
  private readonly bucketName = "generated-files";

  constructor() {
    this.client = new Client({
      endPoint: this.configService.get<string>("MINIO_ENDPOINT") ?? "minio:9000",
      port: parseInt(this.configService.get<string>("MINIO_PORT") ?? "9000", 10),
      useSSL: false,
      accessKey: this.configService.get<string>("MINIO_USER") ?? "minioadmin",
      secretKey: this.configService.get<string>("MINIO_PASSWORD") ?? "minioadmin",
    });
  }

  getFileUrl(fileName: string): string {
    return `http://${this.configService.get<string>("MINIO_ENDPOINT") ?? "http://minio:9000"}/${this.bucketName}/${fileName}`;
  }
}
