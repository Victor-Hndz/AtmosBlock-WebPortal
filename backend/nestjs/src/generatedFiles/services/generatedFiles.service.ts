import { Inject, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { GeneratedFiles } from "@/generatedFiles/domain/entities/generatedFiles.entity";
import { IGeneratedFilesRepository } from "../domain/repositories/generatedFiles.repository";
import { MinioService } from "@/minio/services/minio.service";
import { ConfigService } from "@nestjs/config";

export interface ResultFile {
  name: string;
  url: string;
  type: "image" | "data";
  previewUrl?: string;
}

export interface ResultsData {
  requestHash: string;
  files: ResultFile[];
  status: "complete" | "error";
  message?: string;
}

@Injectable()
export class GeneratedFilesService {
  private readonly logger = new Logger(GeneratedFilesService.name);
  private readonly apiBaseUrl: string;

  constructor(
    @Inject("IGeneratedFilesRepository")
    private readonly generatedFilesRepository: IGeneratedFilesRepository,
    private readonly minioService: MinioService,
    private readonly configService: ConfigService
  ) {
    // Get API base URL for generating proxy URLs
    const apiHost = this.configService.get<string>("API_HOST", "localhost");
    const apiPort = this.configService.get<string>("API_PORT", "3000");
    const apiProtocol = this.configService.get<string>("API_PROTOCOL", "http");
    this.apiBaseUrl = `${apiProtocol}://${apiHost}:${apiPort}`;
    this.logger.log(`API Base URL for file proxying: ${this.apiBaseUrl}`);
  }

  async create(generatedFiles: GeneratedFiles): Promise<GeneratedFiles> {
    const createdEntity = await this.generatedFilesRepository.create(generatedFiles);
    return createdEntity;
  }

  async update(generatedFiles: GeneratedFiles): Promise<GeneratedFiles> {
    const updatedEntity = await this.generatedFilesRepository.update(generatedFiles);
    return updatedEntity;
  }

  /**
   * Find all URLs of generated files for a specific request hash
   * @param requestHash The hash of the request to find files for
   * @returns Object containing request hash, files array, and status
   */
  async findAllUrls(requestHash: string): Promise<ResultsData> {
    try {
      this.logger.log(`Finding URLs for request hash: ${requestHash}`);

      // Check if the folder exists in MinIO first
      const folderExists = await this.minioService.folderExists(requestHash);
      if (!folderExists) {
        this.logger.warn(`No folder found in storage for request hash: ${requestHash}`);
        return {
          requestHash,
          files: [],
          status: "error",
          message: "No result files found for this request",
        };
      }

      // Get the actual files from storage
      const files: ResultFile[] = [];

      try {
        // Get all files from MinIO
        const minioFiles = await this.minioService.listFiles(requestHash);

        if (minioFiles.length === 0) {
          this.logger.warn(`No files found in storage for request hash: ${requestHash}`);
          return {
            requestHash,
            files: [],
            status: "error",
            message: "No files found in storage",
          };
        }

        // Transform MinIO file objects to ResultFile format with proxy URLs
        for (const file of minioFiles) {
          // Get just the filename without the path/folders
          const pathParts = file.name.split("/");
          const fileName = pathParts[pathParts.length - 1];

          // Create proxy URL - use the MinioService's method to ensure proper URL encoding
          const proxyUrl = this.minioService.getProxyUrl(requestHash, fileName);

          const fileType = this.isPreviewableImage(fileName) ? "image" : "data";

          const resultFile: ResultFile = {
            name: fileName,
            url: proxyUrl,
            type: fileType,
          };

          // Add preview URL for image files (same as URL for now)
          if (fileType === "image") {
            resultFile.previewUrl = proxyUrl;
          }

          files.push(resultFile);
          this.logger.debug(`Added file ${fileName} with URL ${proxyUrl}`);
        }
      } catch (error) {
        this.logger.error(`Error retrieving files from storage: ${error.message}`);
        return {
          requestHash,
          files: [],
          status: "error",
          message: `Error retrieving files: ${error.message}`,
        };
      }

      // Now try to get or create the DB entry
      try {
        const generatedFiles = await this.generatedFilesRepository.findByRequestHash(requestHash);

        if (!generatedFiles) {
          this.logger.log(`No DB entry found for ${requestHash}, but files exist in storage`);
        } else {
          this.logger.log(`Found DB entry for ${requestHash} with ${generatedFiles.files?.length || 0} files`);
        }
      } catch (error) {
        this.logger.warn(`Error checking DB entry: ${error.message}`);
        // Continue with the files from storage anyway
      }

      return {
        requestHash,
        files,
        status: "complete",
      };
    } catch (error) {
      this.logger.error(`Error in findAllUrls: ${error.message}`);

      if (error instanceof NotFoundException) {
        return {
          requestHash,
          files: [],
          status: "error",
          message: error.message,
        };
      }

      throw error;
    }
  }

  /**
   * Determine if a file is an image that can be previewed
   * @param fileName The name of the file to check
   * @returns Boolean indicating if the file is previewable
   */
  private isPreviewableImage(fileName: string): boolean {
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
