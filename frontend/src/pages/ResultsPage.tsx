import { useState, useEffect, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";
import { Loader2, AlertTriangle, Check, Download, Eye, FileIcon } from "lucide-react";
import ResultsService, { ResultFile, ResultsData } from "@/services/resultsService";
import ProgressService, { ProgressUpdateData } from "@/services/progressService";
import { MAX_PROGRESS } from "@/consts/progressConsts";

// Component for displaying file preview
const FilePreview: React.FC<{ file: ResultFile }> = ({ file }) => {
  const [enlarged, setEnlarged] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const { t } = useTranslation();
  const imageTimeoutRef = useRef<number | null>(null);

  const isImage = file.name.match(/\.(jpeg|jpg|png|gif|svg)$/i);
  const isPdf = file.name.match(/\.pdf$/i);

  console.log(`Rendering preview for file: ${file.name}, URL: ${file.url}, isImage: ${isImage}, isPdf: ${isPdf}`);

  useEffect(() => {
    // Reset states when file changes
    setImageLoaded(false);
    setHasError(false);

    // Set a timeout to avoid infinite loading state
    if (isImage) {
      // Clear any existing timeout
      if (imageTimeoutRef.current) {
        window.clearTimeout(imageTimeoutRef.current);
      }

      // Set a new timeout (10 seconds) after which we'll consider the image loading failed
      imageTimeoutRef.current = window.setTimeout(() => {
        if (!imageLoaded && !hasError) {
          console.error(`Image load timeout for: ${file.url}`);
          setHasError(true);
        }
      }, 10000); // 10 seconds timeout
    }

    return () => {
      // Clean up timeout on unmount or when file changes
      if (imageTimeoutRef.current) {
        window.clearTimeout(imageTimeoutRef.current);
      }
    };
  }, [file, isImage, imageLoaded, hasError]);

  // Handle image loading errors
  const handleImageError = () => {
    console.error(`Failed to load image: ${file.url}`);
    setHasError(true);
    if (imageTimeoutRef.current) {
      window.clearTimeout(imageTimeoutRef.current);
    }
  };

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
          <div
            onClick={() => setEnlarged(!enlarged)}
            className={`
              border border-slate-200 rounded overflow-auto relative 
              ${enlarged ? "cursor-zoom-out" : "cursor-zoom-in"}
              bg-white
            `}
            style={{
              maxWidth: enlarged ? "90vw" : "100%",
              maxHeight: enlarged ? "90vh" : "60vh",
              transition: "all 0.3s ease",
              transform: enlarged ? "scale(2)" : "scale(1)",
              transformOrigin: "center",
            }}
          >
            <img
              src={file.url}
              alt={file.name}
              className={`object-contain ${enlarged ? "w-full h-full" : "max-h-60 w-auto mx-auto"}`}
              onLoad={() => setImageLoaded(true)}
              onError={handleImageError}
            />
          </div>
        )}

        {isPdf && (
          <div className={`${enlarged ? "w-[90vw] h-[90vh]" : "h-60 w-full"}`}>
            <iframe
              src={`${file.url}#toolbar=0&view=FitH`}
              className="w-full h-full border border-slate-200 rounded"
              title={file.name}
              onLoad={() => setImageLoaded(true)}
              onError={handleImageError}
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
  const [totalProgress, setTotalProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [resultsData, setResultsData] = useState<ResultsData | null>(null);
  const [previewFile, setPreviewFile] = useState<ResultFile | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isLoadingResults, setIsLoadingResults] = useState(false);
  const [progressComplete, setProgressComplete] = useState(false);
  const previousRequestHashRef = useRef<string | null>(null);

  // Fetch result files when processing is complete
  const fetchResults = useCallback(async () => {
    if (!requestHash) return;

    try {
      setIsLoadingResults(true);
      const data = await ResultsService.getResultFiles(requestHash);
      setResultsData(data);

      // Set the first image file as the preview file if available
      const imageFile = data.files.find(file => ResultsService.isPreviewableImage(file.name));
      if (imageFile) {
        setPreviewFile(imageFile);
      }
      setIsComplete(true);
      setIsLoadingResults(false);
    } catch (error) {
      console.error("Error fetching results:", error);
      // setHasError(true);
      // setIsLoadingResults(false);
    }
  }, [requestHash]);

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
      // Check if this is a new request or just a page reload
      const isNewRequest = previousRequestHashRef.current !== requestHash;

      // Only reset states when starting a new connection for a new request
      if (isNewRequest) {
        console.log("New request detected, resetting states");
        setIsConnected(false);
        setHasError(false);
        setIsComplete(false);
        setTotalProgress(0);
        setProgressComplete(false);
        setProgressMessage("");
        setResultsData(null);
        setPreviewFile(null);
      }

      // Update the reference for future comparisons
      previousRequestHashRef.current = requestHash;

      // Connect to the progress stream
      cleanup = ProgressService.connectToProgressStream({
        requestHash,
        onConnect: () => {
          console.log("Connected to progress stream successfully");
          setIsConnected(true);
          setHasError(false);
          // Set default progress to 5% and default message
          setTotalProgress(5);
          setProgressMessage("CONFIG: " + t("results.initializing", "Initializing processing..."));
        },
        onUpdate: (data: ProgressUpdateData) => {
          console.log(`Received progress update: ${JSON.stringify(data)}`);

          // Update progress message
          if (data.message) {
            setProgressMessage(data.message);
          }

          // Handle progress updates
          if (data.increment > 0) {
            // Update total progress, ensuring it doesn't exceed MAX_PROGRESS
            setTotalProgress(prev => Math.min(prev + data.increment, MAX_PROGRESS));
          }

          // If completed flag is sent, set progress to 100%
          if (data.completed === true) {
            console.log("Server signaled completion");
            setTotalProgress(MAX_PROGRESS);
            setProgressComplete(true);
            setIsConnected(false);
            fetchResults();
          }
        },
        onError: () => {
          console.error("Error with progress stream connection");
          setHasError(true);
          setIsConnected(false);

          // Only try to fetch if we haven't already been marked as complete
          if (!progressComplete) {
            // Try to fetch results anyway, maybe they're already available
            fetchResults();
          }
        },
        onComplete: () => {
          console.log("Progress stream completed");
          setIsConnected(false);

          // Set progress to 100% if we're completing
          if (!isComplete && !hasError) {
            setTotalProgress(MAX_PROGRESS);
          }

          // Only fetch results if we haven't already been marked as complete
          if (!progressComplete && !isComplete) {
            fetchResults();
          }
        },
      });
    }

    // Clean up connection when unmounted
    return () => {
      if (cleanup) {
        cleanup();
      }
    };
  }, [requestHash, fetchResults, progressComplete]);

  // Handle downloading all files
  const handleDownloadAll = async () => {
    if (!resultsData || !requestHash) return;

    try {
      setIsDownloading(true);
      await ResultsService.downloadAllFiles(resultsData.files);
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
                ) : isLoadingResults ? (
                  <span className="flex items-center text-blue-600">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t("results.loadingResults", "Loading results...")}
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
              <div className="text-sm font-medium text-slate-900">{Math.round(totalProgress)}%</div>
            </div>

            <div className="relative overflow-hidden bg-slate-200 rounded-full h-2">
              <div
                className={`h-full transition-all duration-200 ease-in-out ${
                  hasError ? "bg-red-500" : isComplete || progressComplete ? "bg-green-500" : "bg-blue-600"
                }`}
                style={{ width: `${totalProgress}%` }}
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
