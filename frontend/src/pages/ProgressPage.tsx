import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { ArrowRight, RefreshCw, Loader2 } from "lucide-react";
import * as Separator from "@radix-ui/react-separator";
import * as Tabs from "@radix-ui/react-tabs";
import { ProgressBar } from "@/components/ui/ProgressBar";
import ProgressService from "@/services/progressService";

/**
 * ProgressPage component
 * A test page for displaying and interacting with progress indicators
 *
 * @returns JSX.Element - The rendered ProgressPage component
 */
export default function ProgressPage(): React.ReactElement {
  const { t } = useTranslation();
  const [showProgress, setShowProgress] = useState(false);
  const [useSimulator, setUseSimulator] = useState(true);
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState("");
  const [simulationActive, setSimulationActive] = useState(false);

  // Effect to handle simulation
  useEffect(() => {
    let cleanup: (() => void) | null = null;

    if (showProgress && useSimulator) {
      setSimulationActive(true);

      // Start simulation
      cleanup = ProgressService.simulateProgressUpdates(data => {
        setProgress(data.increment);
        setProgressMessage(data.message);

        if (data.increment >= 100) {
          setSimulationActive(false);
        }
      });
    }

    // Clean up simulation when unmounted or when showProgress changes
    return () => {
      if (cleanup) {
        cleanup();
      }
    };
  }, [showProgress, useSimulator]);

  const handleConnectClick = () => {
    setProgress(0);
    setProgressMessage("");
    setShowProgress(true);
  };

  const handleComplete = () => {
    console.log("Progress completed!");
    // You can add additional logic here when progress is complete
  };

  const handleReset = () => {
    setShowProgress(false);
    // Wait a bit before showing again to ensure complete disconnect/reconnect
    setTimeout(() => setShowProgress(true), 100);
  };

  return (
    <div className="space-y-16 py-8">
      {/* Hero Section */}
      <section className="text-center">
        <h1 className="text-4xl md:text-5xl font-bold mb-4 text-slate-900">
          {t("progress.title", "Progress Monitor")}
        </h1>
        <p className="text-xl text-slate-600 max-w-3xl mx-auto mb-8">
          {t("progress.subtitle", "Real-time visualization of server-side process updates")}
        </p>
      </section>

      <Separator.Root className="h-px bg-slate-200 w-full max-w-4xl mx-auto" />

      {/* Progress Demonstration Section */}
      <section className="max-w-3xl mx-auto px-4">
        <h2 className="text-2xl font-bold mb-6 text-slate-900">{t("progress.demoTitle", "Progress Demonstration")}</h2>

        <Tabs.Root defaultValue="live" className="w-full">
          <Tabs.List className="flex border-b border-slate-200 mb-6">
            <Tabs.Trigger
              value="live"
              className="px-4 py-2 text-slate-600 font-medium data-[state=active]:text-violet-600 data-[state=active]:border-b-2 data-[state=active]:border-violet-600"
            >
              {t("progress.liveTab", "Live Progress")}
            </Tabs.Trigger>
            <Tabs.Trigger
              value="demo"
              className="px-4 py-2 text-slate-600 font-medium data-[state=active]:text-violet-600 data-[state=active]:border-b-2 data-[state=active]:border-violet-600"
            >
              {t("progress.demoTab", "How It Works")}
            </Tabs.Trigger>
          </Tabs.List>

          <Tabs.Content value="live" className="focus:outline-none">
            <div className="bg-white rounded-lg p-6 shadow-sm border border-slate-200">
              <h3 className="text-lg font-semibold mb-4 text-slate-900">
                {t("progress.liveTitle", "Real-Time Process Updates")}
              </h3>
              {showProgress ? (
                <div className="space-y-6">
                  {useSimulator ? (
                    <div className="w-full space-y-2">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-sm font-medium text-slate-700">
                          {simulationActive ? (
                            <span className="flex items-center">
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              {t("progress.simulating")}
                            </span>
                          ) : null}
                        </div>

                        <div className="text-sm font-medium text-slate-900">{Math.round(progress)}%</div>
                      </div>

                      <div className="relative overflow-hidden bg-slate-200 rounded-full w-full h-2">
                        <div
                          className="bg-violet-600 h-full transition-all duration-500 ease-in-out"
                          style={{ width: `${progress}%` }}
                        />
                      </div>

                      {progressMessage && <p className="mt-2 text-sm text-slate-600">{progressMessage}</p>}
                    </div>
                  ) : (
                    <ProgressBar onComplete={handleComplete} className="w-full" />
                  )}

                  <div className="flex justify-between">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={useSimulator}
                        onChange={() => setUseSimulator(!useSimulator)}
                        className="rounded border-gray-300 text-violet-600 focus:ring-violet-500"
                      />
                      <span className="text-sm text-slate-700">
                        {t("progress.useSimulator", "Use simulator (for testing)")}
                      </span>
                    </label>

                    <button
                      onClick={handleReset}
                      className="px-4 py-2 flex items-center gap-2 text-sm font-medium text-slate-700 rounded-md border border-slate-300 hover:bg-slate-50 transition-colors"
                    >
                      <RefreshCw size={16} />
                      {t("progress.restart", "Restart")}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center py-8">
                  <p className="text-slate-600 mb-6">
                    {t("progress.connectPrompt", "Connect to the server to see real-time progress updates.")}
                  </p>
                  <button
                    onClick={handleConnectClick}
                    className="px-6 py-3 rounded-lg bg-violet-600 text-white font-medium flex items-center gap-2 hover:bg-violet-700 transition-colors"
                  >
                    {t("progress.connect", "Connect to Server")}
                    <ArrowRight size={16} />
                  </button>
                </div>
              )}
            </div>
          </Tabs.Content>

          <Tabs.Content value="demo" className="focus:outline-none">
            <div className="bg-white rounded-lg p-6 shadow-sm border border-slate-200">
              <h3 className="text-lg font-semibold mb-4 text-slate-900">
                {t("progress.howItWorks", "How the Progress Bar Works")}
              </h3>
              <div className="space-y-4 text-slate-700">
                <p>
                  {t(
                    "progress.explanation1",
                    "This progress bar connects to a server-sent events (SSE) endpoint that streams real-time updates from background processes."
                  )}
                </p>
                <p>
                  {t(
                    "progress.explanation2",
                    "The server processes complex tasks such as data generation or long computations, sending progress updates through a RabbitMQ message queue."
                  )}
                </p>
                <p>
                  {t(
                    "progress.explanation3",
                    "As progress updates arrive, the bar fills up and displays status messages, providing real-time feedback on server-side operations."
                  )}
                </p>

                <div className="p-4 bg-slate-50 rounded-md border border-slate-200 mt-4">
                  <h4 className="font-medium text-slate-900 mb-2">
                    {t("progress.technicalDetails", "Technical Implementation")}
                  </h4>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    <li>{t("progress.techDetail1", "Server-Sent Events (SSE) for real-time communication")}</li>
                    <li>{t("progress.techDetail2", "RabbitMQ for message queuing")}</li>
                    <li>{t("progress.techDetail3", "Radix UI components for accessible UI")}</li>
                    <li>{t("progress.techDetail4", "React for state management and UI updates")}</li>
                  </ul>
                </div>
              </div>
            </div>
          </Tabs.Content>
        </Tabs.Root>
      </section>
    </div>
  );
}
