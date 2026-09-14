export interface ProgressEvent {
  requestHash: string;
  increment: number;
  message: string;
  /** Set when the request failed; the stream closes with this generic message (WEB-211). */
  error?: string;
}
