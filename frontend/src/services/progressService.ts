import { API_URL } from "@/consts/apiConsts";
import { MAX_PROGRESS } from "@/consts/progressConsts";

export interface ProgressUpdateData {
  increment: number;
  message: string;
  timestamp?: string;
}

export interface ProgressConnectionCallbacks {
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
    const progressStreamUrl = `${API_URL}/progress/stream`;
    const eventSource = new EventSource(progressStreamUrl);

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
        if (data.increment >= MAX_PROGRESS && callbacks.onComplete) {
          callbacks.onComplete();
          // Auto-close the connection when complete
          setTimeout(() => eventSource.close(), 500);
        }
      } catch (error) {
        console.error("Error parsing progress update:", error);
      }
    };

    // Handle errors
    eventSource.onerror = error => {
      console.error("Progress stream error:", error);
      if (callbacks.onError) {
        callbacks.onError(error);
      }
      eventSource.close();
    };

    // Return cleanup function to close the connection
    return () => {
      console.log("Closing progress stream connection");
      eventSource.close();
    };
  },
};

export default ProgressService;
