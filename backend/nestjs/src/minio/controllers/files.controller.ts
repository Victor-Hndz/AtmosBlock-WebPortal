import {
  Controller,
  Get,
  Logger,
  Param,
  Res,
  StreamableFile,
  InternalServerErrorException,
  All,
} from "@nestjs/common";
import { ApiOperation, ApiParam, ApiTags } from "@nestjs/swagger";
import { MinioService } from "../services/minio.service";
import { Response } from "express";
import { Readable } from "stream";

@ApiTags("files")
@Controller("files")
export class FilesController {
  private readonly logger = new Logger(FilesController.name);

  constructor(private readonly minioService: MinioService) {}

  @Get("proxy/:requestHash/:filename")
  @ApiOperation({ summary: "Proxy file requests to MinIO" })
  @ApiParam({ name: "requestHash", description: "Request hash for the folder" })
  @ApiParam({ name: "filename", description: "Filename to retrieve" })
  async proxyFile(
    @Param("requestHash") requestHash: string,
    @Param("filename") filename: string,
    @Res({ passthrough: true }) res: Response
  ): Promise<StreamableFile> {
    try {
      this.logger.log(`Proxying file: ${requestHash}/${filename}`);
      const filePath = `${requestHash}/${filename}`;

      // Get file from MinIO
      const { stream, metadata } = await this.minioService.getFile(filePath);

      // Validate that we have a proper readable stream
      if (!(stream instanceof Readable)) {
        this.logger.error(`Invalid stream type returned for ${filePath}: ${typeof stream}`);
        throw new InternalServerErrorException("Invalid stream returned from storage");
      }

      // Set appropriate headers
      res.set({
        "Content-Type":
          metadata.metaData && metadata.metaData["content-type"]
            ? metadata.metaData["content-type"]
            : this.getContentType(filename),
        "Content-Disposition": `inline; filename="${filename}"`,
        "Access-Control-Allow-Origin": "*", // Enable CORS
        "Cache-Control": "public, max-age=86400", // Cache for 1 day
      });

      // Return the file as a streamable file
      return new StreamableFile(stream);
    } catch (error) {
      this.logger.error(`Error proxying file ${requestHash}/${filename}: ${error.message}`);
      throw error;
    }
  }

  // Catch-all route to handle any file under the proxy path
  @All("proxy/*")
  catchAll(): string {
    this.logger.warn("Catch-all route hit for files/proxy/*");
    return "File not found. Use /files/proxy/{requestHash}/{filename} format.";
  }

  /**
   * Helper method to determine content type from filename
   */
  private getContentType(filename: string): string {
    const ext = filename.split(".").pop()?.toLowerCase();
    if (!ext) return "application/octet-stream";

    const mimeTypes = {
      pdf: "application/pdf",
      png: "image/png",
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      gif: "image/gif",
      svg: "image/svg+xml",
      txt: "text/plain",
      csv: "text/csv",
      nc: "application/x-netcdf",
      json: "application/json",
    };

    return mimeTypes[ext] || "application/octet-stream";
  }
}
