import { Controller, Get, Param, Logger, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "@/auth/guards/jwt-auth.guard";
import { ResultsService } from "../services/results.service";

@Controller("results")
export class ResultsController {
  private readonly logger = new Logger(ResultsController.name);

  constructor(private readonly resultsService: ResultsService) {}

  /**
   * Get result files for a specific request
   * @param requestHash The hash of the request
   */
  @UseGuards(JwtAuthGuard)
  @Get(":requestHash")
  async getResultFiles(@Param("requestHash") requestHash: string) {
    this.logger.log(`Getting result files for request hash: ${requestHash}`);
    return this.resultsService.getResultFiles(requestHash);
  }
}
