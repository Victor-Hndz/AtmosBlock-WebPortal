import { Controller, Get, Logger, Res, Sse } from "@nestjs/common";
import { Response } from "express";
import { Observable, map } from "rxjs";
import { ProgressService } from "../services/progress.service";
import { ProgressEvent } from "../domain/progress.interface";

interface MessageEvent {
  data: string | object;
}

@Controller("progress")
export class ProgressController {
  private readonly logger = new Logger(ProgressController.name);

  constructor(private readonly progressService: ProgressService) {}

  /**
   * SSE endpoint to stream progress updates to the client
   * @returns Observable of MessageEvent objects
   */
  @Sse("stream")
  streamProgress(): Observable<MessageEvent> {
    this.logger.log("Client connected to progress stream");

    return this.progressService.progress$.pipe(
      map((progressEvent: ProgressEvent) => {
        return {
          data: {
            increment: progressEvent.increment,
            message: progressEvent.message,
            timestamp: new Date().toISOString(),
          },
        };
      })
    );
  }

  /**
   * Health check endpoint
   * @param res Express Response object
   */
  @Get("health")
  healthCheck(@Res() res: Response): void {
    res.status(200).json({ status: "ok", service: "progress" });
  }
}
