import { Controller, Get, Logger, NotFoundException, Param, UseGuards } from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiParam } from "@nestjs/swagger";
import { GeneratedFilesService } from "../services/generatedFiles.service";
import type { ResultsData } from "../services/generatedFiles.service";
import { JwtAuthGuard } from "@/auth/guards/jwt-auth.guard";
import { CurrentUser } from "@/shared/decorators/currentUserDecorator.decorator";
import { UsersService } from "@/users/services/users.service";

@ApiTags("results")
@Controller("results")
export class GeneratedFilesController {
  private readonly logger = new Logger(GeneratedFilesController.name);

  constructor(
    private readonly generatedFilesService: GeneratedFilesService,
    private readonly usersService: UsersService
  ) {}

  @Get(":requestHash")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get all result files for a request" })
  @ApiParam({ name: "requestHash", description: "The hash of the request to get files for" })
  @ApiResponse({
    status: 200,
    description: "Returns all result files with signed, expiring URLs for the specified request hash",
    type: Object,
  })
  @ApiResponse({ status: 401, description: "Authentication required" })
  @ApiResponse({ status: 404, description: "No results found for the request, or it is not the user's" })
  async findAllUrls(
    @Param("requestHash") requestHash: string,
    @CurrentUser("id") userId: string
  ): Promise<ResultsData> {
    // WEB-102 (V2): solo el dueño de la petición recibe sus resultados (404 para no revelar que existe).
    const propias = await this.usersService.getRequestHashesByUserId(userId);
    if (!propias.includes(requestHash)) {
      throw new NotFoundException(`No results found for request: ${requestHash}`);
    }

    this.logger.log(`Retrieving files for request hash: ${requestHash}`);

    const results = await this.generatedFilesService.findAllUrls(requestHash);

    if (results.status === "error") {
      this.logger.warn(`Error retrieving results for ${requestHash}: ${results.message}`);

      if (!results.files || results.files.length === 0) {
        throw new NotFoundException(results.message || `No results found for request: ${requestHash}`);
      }
    }

    this.logger.log(`Found ${results.files.length} files for request ${requestHash}`);
    return results;
  }
}
