import { Client } from "minio";
import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

export interface MinioFileInfo {
  name: string;
  size: number;
  lastModified: Date;
  url: string;
}

@Injectable()
export class MinioService {
  private readonly client: Client;
  private readonly bucketName: string;
  private readonly logger = new Logger(MinioService.name);

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

  /**
   * List all files in a specific folder in the bucket
   * @param folderPath The folder path within the bucket (e.g., requestHash)
   * @returns Array of file info objects
   */
  async listFiles(folderPath: string): Promise<MinioFileInfo[]> {
    try {
      // Ensure the folder path ends with a slash for proper prefix matching
      const prefix = folderPath.endsWith('/') ? folderPath : `${folderPath}/`;
      
      this.logger.log(`Listing files in bucket: ${this.bucketName}, prefix: ${prefix}`);
      
      const files: MinioFileInfo[] = [];
      
      // Create a stream of objects in the bucket with the specified prefix
      const objectsStream = this.client.listObjects(this.bucketName, prefix, true);
      
      // Process each object in the stream
      for await (const obj of objectsStream) {
        if (obj.name && !obj.name.endsWith('/')) { // Skip folders, only include files
          const fileUrl = this.getFileUrl(obj.name);
          files.push({
            name: obj.name.replace(prefix, ''), // Remove the prefix to get just the filename
            size: obj.size,
            lastModified: obj.lastModified,
            url: fileUrl,
          });
        }
      }
      
      this.logger.log(`Found ${files.length} files in folder ${folderPath}`);
      return files;
      
    } catch (error) {
      this.logger.error(`Error listing files in ${folderPath}: ${error.message}`);
      throw new Error(`Failed to list files: ${error.message}`);
    }
  }

  /**
   * Check if a directory exists in the bucket
   * @param folderPath The folder path to check
   * @returns boolean indicating if folder exists
   */
  async folderExists(folderPath: string): Promise<boolean> {
    try {
      // Ensure the folder path ends with a slash for proper prefix matching
      const prefix = folderPath.endsWith('/') ? folderPath : `${folderPath}/`;
      
      // List objects with the folder prefix
      const objectsStream = this.client.listObjects(this.bucketName, prefix, false);
      
      // If we can retrieve at least one object, the folder exists
      for await (const obj of objectsStream) {
        if (obj.name) {
          return true;
        }
      }
      
      return false;
    } catch (error) {
      this.logger.error(`Error checking if folder ${folderPath} exists: ${error.message}`);
      return false;
    }
  }
}
