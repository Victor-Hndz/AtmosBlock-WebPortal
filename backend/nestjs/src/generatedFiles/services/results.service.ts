import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { MinioService } from "@/minio/services/minio.service";
import { Client } from "minio";
import { ConfigService } from "@nestjs/config";

export interface ResultFile {
  name: string;
  url: string;
  type: "image" | "data";
}

export interface ResultsData {
  requestHash: string;
  files: ResultFile[];
  status: "complete" | "error";
  message?: string;
}

@Injectable()
export class ResultsService {
  private readonly logger = new Logger(ResultsService.name);
  private readonly client: Client;
  private readonly bucketName: string;

  constructor(
    private readonly minioService: MinioService,
    private readonly configService: ConfigService
  ) {
    this.bucketName = this.configService.get<string>("MINIO_BUCKET") ?? "generated-files";

    this.client = new Client({
      endPoint: this.configService.get<string>("MINIO_HOST") ?? "minio",
      port: parseInt(this.configService.get<string>("MINIO_PORT") ?? "9000", 10),
      useSSL: false,
      accessKey: this.configService.get<string>("MINIO_USER") ?? "minioadmin",
      secretKey: this.configService.get<string>("MINIO_PASSWORD") ?? "minioadmin",
    });
  }

  /**
   * Get all result files for a specific request hash
   * @param requestHash Hash of the request
   * @returns Promise resolving to result data
   */
  async getResultFiles(requestHash: string): Promise<ResultsData> {
    try {
      this.logger.log(`Getting files for request hash: ${requestHash}`);

      // List objects in the bucket with the prefix of the request hash
      const objectsList = await this.listObjects(`${requestHash}/`);

      if (objectsList.length === 0) {
        throw new NotFoundException(`No result files found for request hash: ${requestHash}`);
      }

      // Map the objects to ResultFile structure
      const files = objectsList.map(obj => {
        const fileName = obj.name.split("/").pop() || obj.name;
        return {
          name: fileName,
          url: this.minioService.getFileUrl(obj.name),
          type: this.isImageFile(fileName) ? ("image" as const) : ("data" as const),
        };
      });

      return {
        requestHash,
        files,
        status: "complete",
      };
    } catch (error) {
      this.logger.error(`Error getting result files: ${error.message}`, error.stack);

      if (error instanceof NotFoundException) {
        throw error;
      }

      return {
        requestHash,
        files: [],
        status: "error",
        message: `Error retrieving files: ${error.message}`,
      };
    }
  }

  /**
   * List objects in MinIO bucket with a specific prefix
   * @param prefix The prefix to filter objects by
   * @returns Promise resolving to an array of object information
   */
  private async listObjects(prefix: string): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const objects: any[] = [];
      const stream = this.client.listObjects(this.bucketName, prefix, true);

      stream.on("data", obj => {
        objects.push(obj);
      });

      stream.on("error", err => {
        reject(err);
      });

      stream.on("end", () => {
        resolve(objects);
      });
    });
  }

  /**
   * Check if a file is an image based on its extension
   * @param fileName Name of the file
   * @returns Boolean indicating if the file is an image
   */
  private isImageFile(fileName: string): boolean {
    const lowerName = fileName.toLowerCase();
    return (
      lowerName.endsWith(".jpg") ||
      lowerName.endsWith(".jpeg") ||
      lowerName.endsWith(".png") ||
      lowerName.endsWith(".svg") ||
      lowerName.endsWith(".gif") ||
      lowerName.endsWith(".pdf")
    );
  }
}
