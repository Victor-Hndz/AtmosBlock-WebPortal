import { Client } from "minio";
import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Readable } from "stream";

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
  private readonly apiBaseUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.bucketName = this.configService.get<string>("MINIO_BUCKET") ?? "generated-files";

    // Get API base URL for generating proxy URLs
    const apiHost = this.configService.get<string>("API_HOST", "localhost");
    const apiPort = this.configService.get<string>("API_PORT", "3000");
    const apiProtocol = this.configService.get<string>("API_PROTOCOL", "http");
    this.apiBaseUrl = `${apiProtocol}://${apiHost}:${apiPort}`;

    // Initialize MinIO client
    const endPoint = this.configService.get<string>("MINIO_HOST") ?? "minio";
    const port = parseInt(this.configService.get<string>("MINIO_PORT") ?? "9000", 10);
    const useSSL = this.configService.get<boolean>("MINIO_USE_SSL") ?? false;
    const accessKey = this.configService.get<string>("MINIO_USER") ?? "minioadmin";
    const secretKey = this.configService.get<string>("MINIO_PASSWORD") ?? "minioadmin";

    this.logger.log(`Initializing MinIO client with endpoint: ${endPoint}, port: ${port}`);

    // Create MinIO client
    try {
      this.client = new Client({
        endPoint,
        port,
        useSSL,
        accessKey,
        secretKey,
      });
      this.logger.log("MinIO client initialized successfully");
    } catch (error) {
      this.logger.error(`Failed to initialize MinIO client: ${error.message}`);
      throw error;
    }
  }

  // Create public file URL using API proxy
  getProxyUrl(requestHash: string, fileName: string): string {
    return `${this.apiBaseUrl}/files/proxy/${requestHash}/${fileName}`;
  }

  // This is kept for compatibility but should not be used
  getFileUrl(fileName: string): string {
    const minioEndpoint = this.configService.get<string>("MINIO_ENDPOINT") ?? "minio:9000";
    return `http://${minioEndpoint}/${this.bucketName}/${fileName}`;
  }

  /**
   * Get a file from MinIO
   * @param filePath The path of the file in the bucket
   * @returns Object with file stream and metadata
   */
  async getFile(filePath: string): Promise<{ stream: Readable; metadata: any }> {
    try {
      this.logger.log(`Getting file from MinIO: bucket=${this.bucketName}, path=${filePath}`);

      // First, check if the object exists
      try {
        await this.client.statObject(this.bucketName, filePath);
      } catch (error) {
        this.logger.error(`Object not found in MinIO: ${filePath}, error: ${error.message}`);
        throw new NotFoundException(`File not found: ${filePath}`);
      }

      // Get the object and its metadata
      const data = await this.client.getObject(this.bucketName, filePath);
      const stat = await this.client.statObject(this.bucketName, filePath);

      // Ensure data is a Node.js Readable stream
      if (!(data instanceof Readable)) {
        this.logger.warn(`Stream from MinIO is not a Node.js Readable: ${typeof data}`);
      }

      return {
        stream: data as Readable, // Cast to Readable as MinIO client should return this type
        metadata: stat,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Error getting file ${filePath}: ${error.message}`);
      throw error;
    }
  }

  /**
   * List all files in a specific folder in the bucket
   * @param folderPath The folder path within the bucket (e.g., requestHash)
   * @returns Array of file info objects
   */
  async listFiles(folderPath: string): Promise<MinioFileInfo[]> {
    try {
      // Ensure the folder path ends with a slash for proper prefix matching
      const prefix = folderPath.endsWith("/") ? folderPath : `${folderPath}/`;

      this.logger.log(`Listing files in bucket: ${this.bucketName}, prefix: ${prefix}`);

      const files: MinioFileInfo[] = [];

      // Create a stream of objects in the bucket with the specified prefix
      const objectsStream = this.client.listObjects(this.bucketName, prefix, true);

      // Process each object in the stream
      for await (const obj of objectsStream) {
        if (obj.name && !obj.name.endsWith("/")) {
          // Skip folders, only include files
          const fileName = obj.name.replace(prefix, ""); // Remove the prefix to get just the filename
          const proxyUrl = this.getProxyUrl(folderPath, fileName);

          files.push({
            name: obj.name,
            size: obj.size,
            lastModified: obj.lastModified,
            url: proxyUrl,
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
      const prefix = folderPath.endsWith("/") ? folderPath : `${folderPath}/`;

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
