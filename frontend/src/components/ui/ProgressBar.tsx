import { useState, useEffect, useRef } from "react";
import * as Progress from "@radix-ui/react-progress";
import { Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";

interface ProgressBarProps {
  progressStreamUrl?: string;
  className?: string;
  onComplete?: () => void;
  autoCloseOnComplete?: boolean;
  showPercentage?: boolean;
}

/**
 * ProgressBar component that connects to SSE stream and displays real-time progress
 * Uses Radix UI Progress for accessible progress indication
 */
export function ProgressBar({
  progressStreamUrl = "/api/progress/stream",
  className = "",
  onComplete,
  autoCloseOnComplete = true,
  showPercentage = true,
}: Readonly<ProgressBarProps>) {
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { t } = useTranslation();

  // Use ref to keep track of completion status across renders
  const isCompleteRef = useRef(false);

  useEffect(() => {
    // Mark as complete if progress is 100%
    if (progress >= 100) {
      isCompleteRef.current = true;
    }

    let eventSource: EventSource | null = null;
    let completionTimeout: NodeJS.Timeout | null = null;

    const connectToEventSource = () => {
      // Don't reconnect if already completed
      if (isCompleteRef.current) {
        return;
      }

      setIsConnecting(true);
      setError(null);

      try {
        eventSource = new EventSource(progressStreamUrl);

        eventSource.onopen = () => {
          console.log("ProgressBar: Connected to event source");
          setIsConnecting(false);
          setIsConnected(true);
        };

        eventSource.onmessage = event => {
          try {
            const data = JSON.parse(event.data);
            console.log("ProgressBar: Received data:", data);

            // Don't allow progress to go backward from 100%
            if (isCompleteRef.current && data.increment < 100) {
              return;
            }

            setProgress(data.increment);
            if (data.message) {
              setMessage(data.message);
            }

            // Handle completion
            if (data.increment >= 100) {
              console.log("ProgressBar: Progress reached 100%");
              isCompleteRef.current = true;

              // Clear any existing timeout
              if (completionTimeout) {
                clearTimeout(completionTimeout);
              }

              // Set timeout to trigger completion
              completionTimeout = setTimeout(() => {
                console.log("ProgressBar: Executing completion callback");
                if (onComplete) {
                  onComplete();
                }

                if (autoCloseOnComplete && eventSource) {
                  console.log("ProgressBar: Auto-closing event source");
                  eventSource.close();
                  setIsConnected(false);
                }
              }, 1000); // Give a slight delay to ensure all updates are processed
            }
          } catch (err) {
            // Don't show errors if already complete
            if (!isCompleteRef.current) {
              setError("Error parsing event data");
              console.error("ProgressBar: Error parsing SSE data:", err);
            }
          }
        };

        eventSource.onerror = err => {
          console.error("ProgressBar: SSE Error:", err);

          // Don't update UI or show errors if already complete
          if (isCompleteRef.current) {
            if (eventSource) {
              eventSource.close();
            }
            return;
          }

          setIsConnecting(false);
          setIsConnected(false);

          // If we already have 100% progress, this might be a normal closure
          if (progress >= 100) {
            console.log("ProgressBar: Connection closed after reaching 100%");
            isCompleteRef.current = true;
            if (onComplete && !completionTimeout) {
              onComplete();
            }
          } else {
            setError("Connection error with progress stream");

            // Close the connection on error
            if (eventSource) {
              eventSource.close();
            }
          }
        };
      } catch (err) {
        // Don't show errors if already complete
        if (!isCompleteRef.current) {
          setIsConnecting(false);
          setIsConnected(false);
          setError(`Failed to connect to progress stream: ${err instanceof Error ? err.message : "Unknown error"}`);
          console.error("ProgressBar: Failed to connect to SSE:", err);
        }
      }
    };

    // Only connect if not already complete
    if (!isCompleteRef.current) {
      connectToEventSource();
    }

    // Clean up the event source on unmount
    return () => {
      if (completionTimeout) {
        clearTimeout(completionTimeout);
      }
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [progressStreamUrl, autoCloseOnComplete, onComplete]);

  // Calculate indicator styles
  const progressPercentage = Math.max(0, Math.min(100, progress));

  return (
    <div className={`space-y-2 w-full ${className}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm font-medium text-slate-700">
          {isConnecting && !isCompleteRef.current ? (
            <span className="flex items-center">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {t("progress.connecting")}
            </span>
          ) : !isConnected && !error && progress < 100 && !isCompleteRef.current ? (
            <span>{t("progress.waiting")}</span>
          ) : progress >= 100 || isCompleteRef.current ? (
            <span className="text-green-600">{t("progress.complete", "Complete")}</span>
          ) : null}

          {error && !isCompleteRef.current && <span className="text-red-500">{error}</span>}
        </div>

        {showPercentage && <div className="text-sm font-medium text-slate-900">{Math.round(progressPercentage)}%</div>}
      </div>

      <Progress.Root
        className="relative overflow-hidden bg-slate-200 rounded-full w-full h-2"
        style={{ transform: "translateZ(0)" }}
        value={progressPercentage}
      >
        <Progress.Indicator
          className={`w-full h-full transition-transform duration-500 ease-in-out ${
            progressPercentage >= 100 || isCompleteRef.current ? "bg-green-600" : "bg-violet-600"
          }`}
          style={{ transform: `translateX(-${100 - progressPercentage}%)` }}
        />
      </Progress.Root>

      {message && <p className="mt-2 text-sm text-slate-600">{message}</p>}
    </div>
  );
}
