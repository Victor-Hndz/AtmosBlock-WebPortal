import { Injectable, Logger } from "@nestjs/common";
import { Subject } from "rxjs";
import { ProgressEvent } from "../domain/progress.interface";
import { MAX_PROGRESS } from "@/shared/consts/consts";

@Injectable()
export class ProgressService {
  private readonly logger = new Logger(ProgressService.name);
  private actualProgress = 0;
  private progressSubject = new Subject<ProgressEvent>();
  public progress$ = this.progressSubject.asObservable();

  /**
   * Updates the progress based on the increment received
   * @param progressEvent The progress event containing increment and message
   */
  updateProgress(progressEvent: ProgressEvent): void {
    this.logger.log(`Progress update: ${JSON.stringify(progressEvent)}`);

    // Ensure the increment is valid
    if (progressEvent.increment < 0 || progressEvent.increment > MAX_PROGRESS) {
      this.logger.warn(`Invalid progress increment: ${progressEvent.increment}`);
      return;
    }

    if (progressEvent.increment === MAX_PROGRESS) {
      this.logger.log("Progress reached 100%");

      // Ensure we emit the final 100% progress event before completing
      const finalEvent: ProgressEvent = {
        increment: MAX_PROGRESS,
        message: progressEvent.message || "Process completed successfully.",
      };

      // Set actual progress to 100% (MAX_PROGRESS)
      this.actualProgress = MAX_PROGRESS;

      // Emit the final event
      this.progressSubject.next(finalEvent);

      // Complete the subject after emitting the final event
      setTimeout(() => {
        this.progressSubject.complete();
        this.actualProgress = 0; // Reset progress after completion
      }, 500);

      return;
    }

    this.actualProgress += progressEvent.increment * 4;
    // Cap at MAX_PROGRESS
    if (this.actualProgress > MAX_PROGRESS) {
      this.actualProgress = MAX_PROGRESS;
    }

    progressEvent.increment = this.actualProgress;

    // Emit the progress event to all subscribers
    this.progressSubject.next(progressEvent);
  }

  /**
   * Resets the progress by creating a new subject
   */
  resetProgress(): void {
    this.logger.log("Resetting progress");
    this.progressSubject.complete();
    this.progressSubject = new Subject<ProgressEvent>();
    this.progress$ = this.progressSubject.asObservable();
    this.actualProgress = 0;
  }
}
