import { Injectable, Logger } from "@nestjs/common";
import { Subject } from "rxjs";
import { ProgressEvent } from "../domain/progress.interface";
import { MAX_PROGRESS } from "@/shared/consts/consts";

@Injectable()
export class ProgressService {
  private readonly logger = new Logger(ProgressService.name);
  private actualProgress = 0;
  private progressSubject = new Subject<ProgressEvent>();
  public readonly progress$ = this.progressSubject.asObservable();

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
    this.actualProgress += progressEvent.increment;
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
  }
}
