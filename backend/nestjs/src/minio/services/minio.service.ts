import { Client } from "minio";
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class MinioService {
  private readonly client: Client;
  private readonly bucketName: string;

  constructor(private readonly configService: ConfigService) {
    this.bucketName = this.configService.get<string>("MINIO_BUCKET") ?? "generated-files";

    this.client = new Client({
      endPoint: this.configService.get<string>("MINIO_HOST") ?? "minio",
      port: parseInt(this.configService.get<string>("MINIO_PORT") ?? "9000", 10),
      useSSL: false,
      accessKey: this.configService.get<string>("MINIO_USER") ?? "minioadmin",
      secretKey: this.configService.get<string>("MINIO_PASSWORD") ?? "minioadmin",
    });
  }

  getFileUrl(fileName: string): string {
    const minioEndpoint = this.configService.get<string>("MINIO_ENDPOINT") ?? "minio:9000";
    return `http://${minioEndpoint}/${this.bucketName}/${fileName}`;
  }
}
