import { Injectable, Logger } from "@nestjs/common";
import { ProgressService } from "../services/progress.service";
import { ProgressEvent } from "../domain/progress.interface";

@Injectable()
export class ProgressConsumer {
  private readonly logger = new Logger(ProgressConsumer.name);

  constructor(private readonly progressService: ProgressService) {}

  async handleProgressUpdate(data: ProgressEvent): Promise<boolean> {
    // Validate and process the progress event
    if (data && typeof data.increment === "number" && typeof data.message === "string") {
      this.progressService.updateProgress({
        increment: data.increment,
        message: data.message,
      });
      this.logger.log(`Progress updated: ${data.increment} - ${data.message}`);
      return true;
    } else {
      this.logger.warn(`Invalid progress content structure: ${JSON.stringify(data)}`);
      return false;
    }
  }
}
