import { useState, useEffect } from "react";
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

  useEffect(() => {
    let eventSource: EventSource | null = null;

    const connectToEventSource = () => {
      setIsConnecting(true);
      setError(null);

      try {
        eventSource = new EventSource(progressStreamUrl);

        eventSource.onopen = () => {
          setIsConnecting(false);
          setIsConnected(true);
        };

        eventSource.onmessage = event => {
          try {
            const data = JSON.parse(event.data);
            setProgress(data.increment);
            if (data.message) {
              setMessage(data.message);
            }

            // Handle completion
            if (data.increment >= 100 && autoCloseOnComplete) {
              if (onComplete) {
                onComplete();
              }

              // Close the connection when progress is complete
              if (eventSource) {
                eventSource.close();
                setIsConnected(false);
              }
            }
          } catch (err) {
            setError("Error parsing event data");
            console.error("Error parsing SSE data:", err);
          }
        };

        eventSource.onerror = err => {
          setIsConnecting(false);
          setIsConnected(false);
          setError("Connection error with progress stream");
          console.error("SSE Error:", err);

          // Close the connection on error
          if (eventSource) {
            eventSource.close();
          }
        };
      } catch (err) {
        setIsConnecting(false);
        setIsConnected(false);
        setError(`Failed to connect to progress stream: ${err instanceof Error ? err.message : "Unknown error"}`);
        console.error("Failed to connect to SSE:", err);
      }
    };

    connectToEventSource();

    // Clean up the event source on unmount
    return () => {
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
          {isConnecting ? (
            <span className="flex items-center">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {t("progress.connecting")}
            </span>
          ) : !isConnected && !error ? (
            <span>{t("progress.waiting")}</span>
          ) : null}

          {error && <span className="text-red-500">{error}</span>}
        </div>

        {showPercentage && <div className="text-sm font-medium text-slate-900">{Math.round(progressPercentage)}%</div>}
      </div>

      <Progress.Root
        className="relative overflow-hidden bg-slate-200 rounded-full w-full h-2"
        style={{ transform: "translateZ(0)" }}
        value={progressPercentage}
      >
        <Progress.Indicator
          className="bg-violet-600 w-full h-full transition-transform duration-500 ease-in-out"
          style={{ transform: `translateX(-${100 - progressPercentage}%)` }}
        />
      </Progress.Root>

      {message && <p className="mt-2 text-sm text-slate-600">{message}</p>}
    </div>
  );
}
