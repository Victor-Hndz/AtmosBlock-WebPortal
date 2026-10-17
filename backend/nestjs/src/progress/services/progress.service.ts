import { Injectable, Logger } from "@nestjs/common";
import { Observable, Subject, concat, defer, filter, of, takeWhile } from "rxjs";
import { ProgressEvent } from "../domain/progress.interface";
import { MAX_PROGRESS } from "@/shared/consts/consts";
import { REQUEST_HASH } from "@/shared/request-hash";

@Injectable()
export class ProgressService {
  private readonly logger = new Logger(ProgressService.name);
  private readonly events = new Subject<ProgressEvent>();
  // ponytail: last state per request in this process's memory; move to Redis if the API runs more than one instance.
  private readonly lastByRequest = new Map<string, ProgressEvent>();

  /**
   * Updates the progress of one request (WEB-210: progress is per request, not a global channel)
   * @param progressEvent The progress event containing the request hash, increment and message
   */
  updateProgress(progressEvent: ProgressEvent): void {
    const { requestHash, increment, message, error } = progressEvent;
    this.logger.log(`Progress update: ${JSON.stringify(progressEvent)}`);

    // V14/WEB-302: every producer (AMQP consumers and RequestsService) goes through here.
    if (typeof requestHash !== "string" || !REQUEST_HASH.test(requestHash)) {
      this.logger.warn(`Progress update with an invalid request hash ignored: ${JSON.stringify(requestHash)}`);
      return;
    }
    if (increment < 0 || increment > MAX_PROGRESS) {
      this.logger.warn(`Invalid progress increment: ${increment}`);
      return;
    }

    const previous = this.lastByRequest.get(requestHash)?.increment ?? 0;
    const event: ProgressEvent =
      increment === MAX_PROGRESS
        ? { requestHash, increment: MAX_PROGRESS, message: message || "Process completed successfully." }
        : { requestHash, increment: Math.min(previous + increment * 4, MAX_PROGRESS), message };
    if (error) {
      event.error = error;
    }

    this.lastByRequest.set(requestHash, event);
    this.events.next(event);
  }

  /** Forgets the state of a request that is about to be processed again. */
  reset(requestHash: string): void {
    this.lastByRequest.delete(requestHash);
  }

  /**
   * Progress of one request: its last known state (if any), then live updates, completing at MAX_PROGRESS
   */
  progressOf(requestHash: string): Observable<ProgressEvent> {
    return defer(() => {
      const live = this.events.pipe(filter(event => event.requestHash === requestHash));
      const last = this.lastByRequest.get(requestHash);
      return last ? concat(of(last), live) : live;
    }).pipe(takeWhile(event => event.increment < MAX_PROGRESS, true));
  }
}
