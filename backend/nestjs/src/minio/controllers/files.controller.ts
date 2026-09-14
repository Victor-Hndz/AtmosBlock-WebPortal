import {
  Controller,
  Get,
  Logger,
  Param,
  Query,
  Res,
  StreamableFile,
  InternalServerErrorException,
  ForbiddenException,
  All,
  Header,
} from "@nestjs/common";
import { ApiOperation, ApiParam, ApiQuery, ApiTags } from "@nestjs/swagger";
import { ConfigService } from "@nestjs/config";
import { SkipThrottle } from "@nestjs/throttler";
import { MinioService } from "../services/minio.service";
import { firmaValida } from "../signed-url";
import { Response } from "express";
import { Readable } from "stream";

@ApiTags("files")
@Controller("files")
// A results page loads many files at once; the proxy is already protected by signed, expiring URLs.
@SkipThrottle()
export class FilesController {
  private readonly logger = new Logger(FilesController.name);

  constructor(
    private readonly minioService: MinioService,
    private readonly configService: ConfigService
  ) {}

  @Get("proxy/:requestHash/:filename")
  @ApiOperation({ summary: "Proxy file requests to MinIO (signed, expiring URLs issued by GET /results)" })
  @ApiParam({ name: "requestHash", description: "Request hash for the folder" })
  @ApiParam({ name: "filename", description: "Filename to retrieve" })
  @ApiQuery({ name: "expires", description: "Unix expiry time of the signed URL" })
  @ApiQuery({ name: "sig", description: "HMAC signature of the URL" })
  @Header("Access-Control-Allow-Origin", "*")
  @Header("Access-Control-Allow-Methods", "GET, OPTIONS")
  @Header("Access-Control-Allow-Headers", "Content-Type, Authorization, Accept")
  async proxyFile(
    @Param("requestHash") requestHash: string,
    @Param("filename") filename: string,
    @Query("expires") expires: string,
    @Query("sig") sig: string,
    @Res({ passthrough: true }) res: Response
  ): Promise<StreamableFile> {
    // WEB-102 (V2): solo URLs firmadas y vigentes; sin secreto configurado se deniega todo.
    const secreto = this.configService.get<string>("JWT_SECRET");
    if (!secreto || !firmaValida(`${requestHash}/${filename}`, expires, sig, secreto)) {
      throw new ForbiddenException("Invalid or expired file URL");
    }

    try {
      this.logger.log(`Proxying file: ${requestHash}/${filename}`);
      const filePath = `${requestHash}/${filename}`;

      // Get file from MinIO
      const { stream } = await this.minioService.getFile(filePath);

      // Validate that we have a proper readable stream
      if (!(stream instanceof Readable)) {
        this.logger.error(`Invalid stream type returned for ${filePath}: ${typeof stream}`);
        throw new InternalServerErrorException("Invalid stream returned from storage");
      }

      // Determine content type - use a more robust approach
      const contentType = this.getContentType(filename);

      // Log the content type for debugging
      this.logger.log(`Serving file ${filename} with content type: ${contentType}`);

      // Set appropriate headers
      res.set({
        "Content-Type": contentType,
        "Content-Disposition": this.shouldInlineContent(contentType)
          ? `inline; filename="${filename}"`
          : `attachment; filename="${filename}"`,
        "Access-Control-Allow-Origin": "*", // Enable CORS
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization, Accept",
        "Access-Control-Max-Age": "86400", // 24 hours
        "Cache-Control": "public, max-age=86400", // Cache for 1 day
      });

      // Return the file as a streamable file
      return new StreamableFile(stream);
    } catch (error) {
      this.logger.error(`Error proxying file ${requestHash}/${filename}: ${error.message}`);
      throw error;
    }
  }

  // OPTIONS handler for CORS preflight requests
  @All("proxy/:requestHash/:filename")
  @Header("Access-Control-Allow-Origin", "*")
  @Header("Access-Control-Allow-Methods", "GET, OPTIONS")
  @Header("Access-Control-Allow-Headers", "Content-Type, Authorization, Accept")
  @Header("Access-Control-Max-Age", "86400")
  handleOptions(@Res() res: Response): void {
    res.status(204).end();
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

  /**
   * Determine if content should be displayed inline or as attachment
   */
  private shouldInlineContent(contentType: string): boolean {
    // Types that browsers can typically display
    return contentType.startsWith("image/") || contentType === "application/pdf" || contentType === "text/plain";
  }
}
