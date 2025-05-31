import { API_URL } from "@/consts/apiConsts";
import { MAX_PROGRESS } from "@/consts/progressConsts";

export interface ProgressUpdateData {
  increment: number;
  message: string;
  timestamp?: string;
}

export interface ProgressConnectionCallbacks {
  requestHash: string;
  onUpdate: (data: ProgressUpdateData) => void;
  onConnect?: () => void;
  onError?: (error: Event) => void;
  onComplete?: () => void;
}

export const ProgressService = {
  /**
   * Connects to the server-side progress stream endpoint
   * @param callbacks Object containing callback functions for different stream events
   * @returns Cleanup function to close the connection
   */
  connectToProgressStream: (callbacks: ProgressConnectionCallbacks): (() => void) => {
    const progressStreamUrl = `${API_URL}/progress/stream?requestHash=${callbacks.requestHash}`;
    const eventSource = new EventSource(progressStreamUrl);
    let completed = false;

    // Store initial connection timestamp to prevent reconnection loops
    const connectionTimestamp = Date.now();

    // Initialize connection
    eventSource.onopen = () => {
      console.log("Connected to progress stream");
      if (callbacks.onConnect) {
        callbacks.onConnect();
      }
    };

    // Handle incoming messages
    eventSource.onmessage = event => {
      try {
        const data = JSON.parse(event.data) as ProgressUpdateData;
        callbacks.onUpdate(data);

        // Check if the progress is complete
        if (data.increment >= MAX_PROGRESS && !completed) {
          completed = true;
          console.log("Progress completed, calling onComplete callback");

          // Ensure we call onComplete with a slight delay to allow UI to update
          setTimeout(() => {
            if (callbacks.onComplete) {
              callbacks.onComplete();
            }
            // Auto-close the connection when complete
            eventSource.close();
          }, 500);
        }
      } catch (error) {
        console.error("Error parsing progress update:", error);
      }
    };

    // Handle errors
    eventSource.onerror = error => {
      console.error("Progress stream error:", error);

      // If we've been connected for a while and have already completed, don't call error handler
      if (completed || (Date.now() - connectionTimestamp > 5000 && eventSource.readyState === EventSource.CLOSED)) {
        console.log("Error occurred but progress was already marked complete, ignoring");
        eventSource.close();
        return;
      }

      if (callbacks.onError) {
        callbacks.onError(error);
      }

      // Only close if we're still having issues (avoid closing during temporary disconnects)
      if (eventSource.readyState === EventSource.CLOSED) {
        console.log("Connection was closed permanently");
      }
    };

    // Add handler for when SSE connection naturally closes
    const originalClose = eventSource.close;
    eventSource.close = function () {
      console.log("Progress stream connection closing");
      if (!completed && callbacks.onComplete) {
        // If we're closing but haven't completed, call onComplete
        completed = true;
        callbacks.onComplete();
      }
      return originalClose.call(eventSource);
    };

    // Return cleanup function to close the connection
    return () => {
      console.log("Closing progress stream connection");
      eventSource.close();
    };
  },
};

export default ProgressService;
