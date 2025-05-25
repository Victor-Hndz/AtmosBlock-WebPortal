import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";
import { Loader2, AlertTriangle, Check, Download, Eye, FileIcon } from "lucide-react";
import ResultsService, { ResultFile, ResultsData } from "@/services/resultsService";
import ProgressService, { ProgressUpdateData } from "@/services/progressService";

// Component for displaying file preview
const FilePreview: React.FC<{ file: ResultFile }> = ({ file }) => {
  const [enlarged, setEnlarged] = useState(false);
  const { t } = useTranslation();

  const isImage = file.name.match(/\.(jpeg|jpg|png|gif|svg)$/i);
  const isPdf = file.name.match(/\.pdf$/i);

  if (!isImage && !isPdf) {
    return (
      <div className="flex flex-col items-center justify-center p-6 border border-slate-200 rounded-md bg-slate-50">
        <FileIcon className="w-16 h-16 text-slate-400" />
        <span className="mt-2 text-sm text-slate-600 truncate max-w-full">{file.name}</span>
        <span className="text-xs text-slate-500">{t("results.notPreviewable", "Preview not available")}</span>
      </div>
    );
  }

  return (
    <div className="relative">
      <div
        className={`transition-all duration-300 ${
          enlarged ? "fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-80" : "relative"
        }`}
      >
        {isImage && (
          <img
            src={file.url}
            alt={file.name}
            className={`
              border border-slate-200 rounded 
              ${enlarged ? "max-h-[90vh] max-w-[90vw] object-contain cursor-zoom-out" : "h-60 cursor-zoom-in"}
            `}
            onClick={() => setEnlarged(!enlarged)}
          />
        )}
        {isPdf && (
          <div className={`${enlarged ? "w-[90vw] h-[90vh]" : "h-60 w-full"}`}>
            <iframe
              src={`${file.url}#toolbar=0&view=FitH`}
              className="w-full h-full border border-slate-200 rounded"
              title={file.name}
            />
            <button
              onClick={() => setEnlarged(!enlarged)}
              className="absolute top-2 right-2 p-1 bg-white rounded-full shadow hover:bg-slate-100"
            >
              {enlarged ? t("results.minimize", "Minimize") : t("results.enlarge", "Enlarge")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * ResultsPage component
 * Shows processing progress and displays results when completed
 */
export default function ResultsPage(): React.ReactElement {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const [requestHash, setRequestHash] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [resultsData, setResultsData] = useState<ResultsData | null>(null);
  const [previewFile, setPreviewFile] = useState<ResultFile | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  // Fetch result files when processing is complete
  const fetchResults = async () => {
    if (!requestHash) return;

    try {
      const data = await ResultsService.getResultFiles(requestHash);
      setResultsData(data);

      // Set the first image file as the preview file if available
      const imageFile = data.files.find(file => ResultsService.isPreviewableImage(file.name));
      if (imageFile) {
        setPreviewFile(imageFile);
      }
    } catch (error) {
      console.error("Error fetching results:", error);
      setHasError(true);
    }
  };

  // Get request hash from URL parameters
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const hash = searchParams.get("requestHash");

    if (!hash) {
      // Redirect to home if no request hash is provided
      navigate("/", { replace: true });
      return;
    }

    setRequestHash(hash);
  }, [location, navigate]);

  // Connect to progress stream when component mounts
  useEffect(() => {
    let cleanup: (() => void) | null = null;

    if (requestHash) {
      // Reset states when starting a new connection
      setIsConnected(false);
      setHasError(false);
      setIsComplete(false);

      // Connect to the progress stream
      cleanup = ProgressService.connectToProgressStream({
        onConnect: () => {
          setIsConnected(true);
          setHasError(false);
        },
        onUpdate: (data: ProgressUpdateData) => {
          setProgress(data.increment);
          setProgressMessage(data.message);

          if (data.increment >= 100) {
            setIsComplete(true);
            setIsConnected(false);
            // Fetch results after process is complete
            fetchResults();
          }
        },
        onError: () => {
          setHasError(true);
          setIsConnected(false);
        },
        onComplete: () => {
          setIsComplete(true);
          setIsConnected(false);
          // Fetch results after process is complete
          fetchResults();
        },
      });
    }

    // Clean up connection when unmounted
    return () => {
      if (cleanup) {
        cleanup();
        setIsConnected(false);
      }
    };
  }, [requestHash, fetchResults]);

  // Handle downloading all files
  const handleDownloadAll = async () => {
    if (!resultsData || !requestHash) return;

    try {
      setIsDownloading(true);
      await ResultsService.downloadAllFiles(resultsData.files, requestHash);
      setIsDownloading(false);
    } catch (error) {
      console.error("Error downloading files:", error);
      setIsDownloading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-slate-900 mb-8">{t("results.title", "Process Results")}</h1>

      {/* Progress Section */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold text-slate-800 mb-4">{t("results.processStatus", "Process Status")}</h2>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium">
                {isConnected ? (
                  <span className="flex items-center text-blue-600">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t("results.processing", "Processing your request...")}
                  </span>
                ) : isComplete ? (
                  <span className="flex items-center text-green-600">
                    <Check className="mr-2 h-4 w-4" />
                    {t("results.complete", "Processing complete")}
                  </span>
                ) : hasError ? (
                  <span className="flex items-center text-red-600">
                    <AlertTriangle className="mr-2 h-4 w-4" />
                    {t("results.error", "Error during processing")}
                  </span>
                ) : (
                  <span className="flex items-center text-slate-600">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t("results.connecting", "Connecting...")}
                  </span>
                )}
              </div>
              <div className="text-sm font-medium text-slate-900">{Math.round(progress)}%</div>
            </div>

            <div className="relative overflow-hidden bg-slate-200 rounded-full h-2">
              <div
                className={`h-full transition-all duration-500 ease-in-out ${
                  hasError ? "bg-red-500" : isComplete ? "bg-green-500" : "bg-blue-600"
                }`}
                style={{ width: `${progress}%` }}
              />
            </div>

            {progressMessage && <p className="text-sm text-slate-600">{progressMessage}</p>}
          </div>
        </div>
      </section>

      {/* Results Section - Only shown when process is complete */}
      {isComplete && resultsData && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-slate-800">{t("results.files", "Result Files")}</h2>

            <button
              onClick={handleDownloadAll}
              disabled={isDownloading}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md flex items-center disabled:bg-blue-300"
            >
              {isDownloading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-2 h-4 w-4" />
              )}
              {t("results.downloadAll", "Download All")}
            </button>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
            {/* File Preview */}
            {previewFile && (
              <div className="mb-6">
                <h3 className="text-lg font-medium mb-3 text-slate-800">{t("results.preview", "Preview")}</h3>
                <div className="flex justify-center bg-slate-50 p-4 rounded-md border border-slate-200">
                  <FilePreview file={previewFile} />
                </div>
              </div>
            )}

            {/* File List */}
            <div>
              <h3 className="text-lg font-medium mb-3 text-slate-800">{t("results.fileList", "All Files")}</h3>

              <div className="border rounded-md divide-y">
                {resultsData.files.map((file, index) => (
                  <div key={index} className="p-3 flex items-center justify-between hover:bg-slate-50">
                    <div className="flex items-center">
                      <FileIcon className="h-5 w-5 text-slate-400 mr-3" />
                      <span className="text-sm text-slate-700">{file.name}</span>
                    </div>

                    <div className="flex space-x-2">
                      {ResultsService.isPreviewableImage(file.name) && (
                        <button
                          onClick={() => setPreviewFile(file)}
                          className="p-1.5 rounded-md hover:bg-slate-200 text-slate-600"
                          title={t("results.viewFile", "View file")}
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      )}
                      <a
                        href={file.url}
                        download={file.name}
                        className="p-1.5 rounded-md hover:bg-slate-200 text-slate-600"
                        title={t("results.downloadFile", "Download file")}
                      >
                        <Download className="h-4 w-4" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
