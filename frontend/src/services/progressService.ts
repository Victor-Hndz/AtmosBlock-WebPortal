import { API_URL } from "@/consts/apiConsts";
import { MAX_PROGRESS } from "@/consts/progressConsts";

export interface ProgressUpdateData {
  /** Accumulated progress of the request, 0-100 (the API keeps the historical name "increment") */
  increment: number;
  message: string;
  timestamp?: string;
  completed?: boolean; // Add completed flag to interface
  error?: string; // Set when the request failed on the server (WEB-211)
}

export interface ProgressConnectionCallbacks {
  requestHash: string;
  onUpdate: (data: ProgressUpdateData) => void;
  onConnect?: () => void;
  onError?: (error: Event) => void;
  onComplete?: () => void;
}

/**
 * Opens the SSE connection on an already signed stream URL
 * @returns The EventSource, so it can be closed
 */
const openProgressStream = (progressStreamUrl: string, callbacks: ProgressConnectionCallbacks): EventSource => {
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

      // Check if the progress is complete (either by explicit flag or by progress value)
      if ((data.completed === true || data.increment >= MAX_PROGRESS) && !completed) {
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
    console.log("Completed status:", completed);

    // If we've been connected for a while and have already completed, don't call error handler
    if (completed || Date.now() - connectionTimestamp > 5000) {
      console.log("Error occurred but progress was already marked complete, ignoring");
      eventSource.close();
      return;
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

  return eventSource;
};

export const ProgressService = {
  /**
   * Connects to the progress stream of one request. The API signs the stream URL for the request's owner
   * (WEB-210), because EventSource cannot send the Authorization header.
   * @param callbacks Object containing callback functions for different stream events
   * @returns Cleanup function to close the connection
   */
  connectToProgressStream: (callbacks: ProgressConnectionCallbacks): (() => void) => {
    let eventSource: EventSource | null = null;
    let closed = false;
    const token = localStorage.getItem("token");

    fetch(`${API_URL}/progress/stream-url/${encodeURIComponent(callbacks.requestHash)}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then(response => {
        if (!response.ok) {
          throw new Error(`Could not get the progress stream URL: ${response.status}`);
        }
        return response.json() as Promise<{ url: string }>;
      })
      .then(({ url }) => {
        if (!closed) {
          eventSource = openProgressStream(`${API_URL}${url}`, callbacks);
        }
      })
      .catch(error => {
        console.error("Error connecting to progress stream:", error);
        callbacks.onError?.(new Event("error"));
      });

    // Return cleanup function to close the connection
    return () => {
      console.log("Closing progress stream connection");
      closed = true;
      eventSource?.close();
    };
  },
};

export default ProgressService;
