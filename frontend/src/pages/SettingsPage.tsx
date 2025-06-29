import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import * as Dialog from "@radix-ui/react-dialog";
import { useAppSelector, useAppDispatch } from "@/redux/hooks";
import { Navigate, useNavigate } from "react-router-dom";
import {
  Calendar,
  Layers,
  Map,
  FileText,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  ExternalLink,
  Download,
  X,
} from "lucide-react";
import { Tooltip } from "@/components/ui/Tooltip";
import * as Collapsible from "@radix-ui/react-collapsible";
import * as Toast from "@radix-ui/react-toast";
import { fetchUserRequests } from "@/redux/slices/viewRequestsSlice";
import { prefillForm } from "@/redux/slices/submitRequestsSlice";
import { RequestGroup, groupRequestsByContent, RequestForm } from "@/types/Request";
import { TFunction } from "i18next";
import ResultsService from "@/services/resultsService";

/**
 * Custom Badge component to replace the Radix Badge
 */
interface BadgeProps {
  children: React.ReactNode;
  className?: string;
}

const Badge: React.FC<BadgeProps> = ({ children, className = "" }) => (
  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${className}`}>
    {children}
  </span>
);

/**
 * Format date for display
 * @param dateObj Date object with year, month, day
 * @returns Formatted date string
 */
const formatDate = (dateObj: { year: number; month: number; day: number }): string => {
  return `${dateObj.year}-${String(dateObj.month).padStart(2, "0")}-${String(dateObj.day).padStart(2, "0")}`;
};

/**
 * Format ISO date string to readable format
 * @param dateStr ISO date string
 * @returns Formatted date string
 */
const formatCreatedDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.toLocaleDateString();
};

/**
 * Format pressure levels array for display
 * @param levels Array of pressure levels
 * @returns Formatted string
 */
const formatPressureLevels = (levels: number[]): string => {
  if (levels.length === 0) return "None";
  if (levels.length === 1) return `${levels[0]}hPa`;
  if (levels.length <= 3) return levels.join("hPa, ");
  return `${levels.length} levels`;
};

/**
 * Format area for display
 * @param area Area object with coordinates
 * @returns Formatted string
 */
const formatArea = (area: { north: number; south: number; east: number; west: number }): string => {
  return `N:${area.north}, S:${area.south}, E:${area.east}, W:${area.west}`;
};

/**
 * Format request status for display colors
 * @param status Request status string
 * @returns Formatted string for status color
 * @example "completed" => "text-green-600"
 */
const formatRequestStatus = (status: string): string => {
  switch (status) {
    case "completed":
      return "text-green-600";
    case "failed":
      return "text-red-600";
    case "processing":
      return "text-orange-600";
    default:
      return "text-blue-600";
  }
};

const formatRequestGroups = (groups: RequestGroup[], t: TFunction): React.ReactNode => {
  if (groups.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-gray-400 mb-2">
          <ExternalLink size={48} className="mx-auto" />
        </div>
        <p className="text-gray-600">{t("settings.noRequests")}</p>
        <a
          href="/requests"
          className="inline-block mt-3 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
        >
          {t("settings.makeRequest")}
        </a>
      </div>
    );
  }

  return (
    <div>
      {groups.map(group => (
        <RequestItem key={group.request.requestHash} group={group} formRequest={group.formRequest} />
      ))}
    </div>
  );
};

/**
 * Request item component
 */
interface RequestItemProps {
  group: RequestGroup;
  formRequest: RequestForm;
}

const RequestItem: React.FC<RequestItemProps> = ({ group, formRequest }) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [toastOpen, setToastOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState<"error" | "success" | "info" | "warning">("info");
  const [showMapTypesPopup, setShowMapTypesPopup] = useState(false);
  const { request, count } = group;
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  /**
   * Handle click on "Request Again" button
   * This converts the request to form data format and navigates to requests form
   */
  const handleRequestAgain = () => {
    try {
      setIsRequesting(true);

      // Convert the UserRequest to RequestForm format
      const formData = formRequest;

      // Dispatch action to prefill form
      dispatch(prefillForm(formData));

      // Show success toast
      setToastMessage(t("requests.formPrefilled", "Request data loaded in form"));
      setToastType("success");
      setToastOpen(true);

      // Add a small delay for better UX
      setTimeout(() => {
        // Navigate to requests page
        navigate("/requests");
        setIsRequesting(false);
      }, 500);
    } catch (error) {
      console.error("Error prefilling form:", error);
      setIsRequesting(false);

      // Show error toast
      setToastMessage(t("errors.prefillError", "Could not load request data"));
      setToastType("error");
      setToastOpen(true);

      // Fall back to just navigating without prefill if there's an error
      setTimeout(() => {
        navigate("/requests");
      }, 1000);
    }
  };

  const handleDownloadFiles = async (requestHash: string) => {
    try {
      setIsDownloading(true);
      // Fetch the result files for this request
      const results = await ResultsService.getResultFiles(requestHash);

      ResultsService.downloadAllFiles(results.files);
    } catch (error) {
      console.error("Error downloading files:", error);
      setToastMessage(t("errors.downloadError", "Could not download files"));
      setToastType("error");
      setToastOpen(true);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="border rounded-md overflow-hidden mb-4">
      {/* Map types dialog using Radix UI */}
      <Dialog.Root open={showMapTypesPopup} onOpenChange={setShowMapTypesPopup}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/30 backdrop-blur-[2px]" />
          <Dialog.Content className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg p-6 w-[90vw] max-w-md max-h-[80vh] overflow-auto focus:outline-none z-50 shadow-xl">
            <Dialog.Title className="font-medium mb-3">{t("requests.allMapTypes")}</Dialog.Title>
            <Dialog.Description className="sr-only">
              {t("requests.allMapTypesDescription", "List of all map types for this request")}
            </Dialog.Description>

            <ul className="space-y-2">
              {request.mapTypes.map((type, index) => (
                <li key={index} className="border-b pb-1 last:border-0">
                  {t(`mapTypes-list.${type.toLowerCase()}`, "Type not found")}
                </li>
              ))}
            </ul>

            <Dialog.Close asChild>
              <button
                className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 w-full"
                aria-label={t("common.close")}
              >
                {t("common.close")}
              </button>
            </Dialog.Close>

            <Dialog.Close asChild>
              <button
                className="absolute top-3 right-3 p-1 rounded-full hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-label={t("common.close")}
              >
                <X size={18} />
              </button>
            </Dialog.Close>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <Collapsible.Root open={isOpen} onOpenChange={setIsOpen}>
        <Collapsible.Trigger asChild>
          <div className="flex flex-col md:flex-row md:justify-between md:items-center p-4 bg-white cursor-pointer hover:bg-gray-50">
            <div className="flex-1 mb-2 md:mb-0">
              <h3 className="font-medium flex items-center">
                <FileText className="mr-2 text-blue-500" size={18} />
                <span>{request.variableName}</span>
                {count > 1 && <Badge className="ml-2 bg-blue-100 text-blue-800">x{count}</Badge>}
              </h3>
              <div className="flex flex-wrap gap-x-4 text-sm text-gray-500 mt-1">
                <span className="flex items-center">
                  <Calendar className="mr-1" size={14} />
                  {formatDate(request.date)}
                </span>
                <span className="flex items-center">
                  <Layers className="mr-1" size={14} />
                  {formatPressureLevels(request.pressureLevels)}
                </span>
                <span className="flex items-center">
                  <Map className="mr-1" size={14} />
                  {formatArea(request.areaCovered)}
                </span>
              </div>
            </div>
            <div className="flex items-center">
              <span className="text-sm text-gray-500 mr-4">{formatCreatedDate(request.createdAt)}</span>
              <button className="text-blue-600 hover:text-blue-800 transition-colors">
                {isOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
              </button>
            </div>
          </div>
        </Collapsible.Trigger>

        <Collapsible.Content className="bg-gray-50 p-4 border-t">
          <div className="space-y-3">
            <h4 className="font-medium">{t("requests.details")}</h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">{t("requests.variableName")}</p>
                <p>{request.variableName}</p>
              </div>

              <div>
                <p className="text-sm text-gray-500">{t("requests.date")}</p>
                <p>{formatDate(request.date)}</p>
              </div>

              <div>
                <p className="text-sm text-gray-500">{t("requests.pressureLevels")}</p>
                {request.pressureLevels.length === 1 ? (
                  <p>{request.pressureLevels} hPa</p>
                ) : (
                  <p>{request.pressureLevels.join("hPa, ")}</p>
                )}
              </div>

              <div>
                <p className="text-sm text-gray-500">{t("requests.areaCovered")}</p>
                <p>{formatArea(request.areaCovered)}</p>
              </div>

              <div>
                <p className="text-sm text-gray-500">{t("requests.mapTypes")}</p>
                {request.mapTypes.length === 1 ? (
                  <p>{t(`mapTypes-list.${request.mapTypes[0].toLowerCase()}`, "Type not found")}</p>
                ) : (
                  <p className="flex items-center">
                    <button
                      className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded hover:bg-blue-200"
                      onClick={e => {
                        e.stopPropagation();
                        setShowMapTypesPopup(true);
                      }}
                    >
                      {t("common.viewAll")} ({request.mapTypes.length})
                    </button>
                  </p>
                )}
              </div>

              {request.mapLevels && (
                <div>
                  <p className="text-sm text-gray-500">{t("requests.mapLevels")}</p>
                  <p>{request.mapLevels}</p>
                </div>
              )}

              {request.format && (
                <div>
                  <p className="text-sm text-gray-500">{t("requests.format")}</p>
                  <p>{request.format.toUpperCase()}</p>
                </div>
              )}

              <div>
                <p className="text-sm text-gray-500">{t("requests.status")}</p>
                <p className={`${formatRequestStatus(request.status)}`}>{t(`requests.statuses.${request.status}`)}</p>
              </div>

              <div>
                <p className="text-sm text-gray-500">{t("requests.created")}</p>
                <p>{new Date(request.createdAt).toLocaleString()}</p>
              </div>
            </div>

            <div className="pt-3 border-t mt-3 flex flex-col md:flex-row gap-3 justify-between">
              <Tooltip content={t("requests.requestAgainTooltip", "Fill the form with this request data")} delay={300}>
                <button
                  className={`flex items-center gap-2 px-3 py-1.5 text-sm ${isRequesting ? "bg-blue-400 cursor-wait" : "bg-blue-500 hover:bg-blue-600"} text-white rounded-md transition-colors`}
                  onClick={handleRequestAgain}
                  disabled={isRequesting}
                  aria-label={t("requests.requestAgainAriaLabel", "Request this data again")}
                  aria-busy={isRequesting}
                >
                  {isRequesting ? (
                    <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  ) : (
                    <RefreshCw size={14} className={isRequesting ? "animate-spin" : ""} />
                  )}
                  <span>{isRequesting ? t("common.loading") : t("requests.requestAgain")}</span>
                </button>
              </Tooltip>

              <Tooltip content={t("requests.downloadFilesTooltip", "Download all the files")} delay={300}>
                <button
                  className={`flex items-center gap-2 px-3 py-1.5 text-sm ${isDownloading ? "bg-green-500 cursor-wait" : "bg-green-600 hover:bg-green-500"} text-white rounded-md transition-colors`}
                  onClick={() => handleDownloadFiles(request.requestHash)}
                  disabled={isDownloading}
                  aria-label={t("requests.downloadFilesAriaLabel", "Download all files for this request")}
                  aria-busy={isDownloading}
                >
                  {isDownloading ? (
                    <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  ) : (
                    <Download size={14} className={isDownloading ? "animate-spin" : ""} />
                  )}
                  <span>{isDownloading ? t("common.loading") : t("requests.downloadFiles")}</span>
                </button>
              </Tooltip>
            </div>
          </div>
        </Collapsible.Content>
      </Collapsible.Root>

      {/* Toast notification for this RequestItem */}
      <Toast.Provider swipeDirection="right">
        <Toast.Root
          className={`fixed bottom-4 right-4 p-4 rounded-md shadow-md max-w-sm 
          ${
            toastType === "error"
              ? "bg-red-50 border border-red-200"
              : toastType === "success"
                ? "bg-green-50 border border-green-200"
                : "bg-blue-50 border border-blue-200"
          } 
          data-[state=open]:animate-slideIn data-[state=closed]:animate-slideOut`}
          open={toastOpen}
          onOpenChange={setToastOpen}
          duration={3000}
        >
          <Toast.Title
            className={`font-medium flex items-center gap-2 
            ${toastType === "error" ? "text-red-800" : toastType === "success" ? "text-green-800" : "text-blue-800"}`}
          >
            <AlertCircle size={16} />
            {t(`toast.${toastType}`)}
          </Toast.Title>
          <Toast.Description
            className={`${
              toastType === "error" ? "text-red-700" : toastType === "success" ? "text-green-700" : "text-blue-700"
            }`}
          >
            {toastMessage}
          </Toast.Description>
          <Toast.Close className="absolute top-2 right-2 text-gray-400 hover:text-gray-600">×</Toast.Close>
        </Toast.Root>
        <Toast.Viewport />
      </Toast.Provider>
    </div>
  );
};

/**
 * Settings page component that displays user requests history
 * @returns JSX for the settings page
 */
const SettingsPage: React.FC = () => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();

  // Get authentication state
  const { isAuthenticated, user } = useAppSelector(state => state.auth);

  // Get requests data
  const { items: requests, isLoading, error } = useAppSelector(state => state.viewRequests);

  // Toast state
  const [toastOpen, setToastOpen] = useState(false);

  // Group requests
  const requestGroups = groupRequestsByContent(requests);

  // Fetch requests on component mount
  useEffect(() => {
    dispatch(fetchUserRequests());
  }, [dispatch]);

  // Show error toast
  useEffect(() => {
    if (error) {
      setToastOpen(true);
    }
  }, [error]);

  // Redirect if not authenticated
  if (!isAuthenticated || !user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <Toast.Provider swipeDirection="right">
      <div className="max-w-4xl mx-auto p-4">
        <h1 className="text-2xl font-bold mb-6">{t("settings.title")}</h1>

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">{t("settings.requestsHistory")}</h2>

          {isLoading ? (
            <div className="text-center py-8">
              <div className="inline-block w-6 h-6 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
              <p className="mt-2 text-gray-600">{t("common.loading")}</p>
            </div>
          ) : (
            formatRequestGroups(requestGroups, t)
          )}
        </div>
      </div>

      {/* Error Toast */}
      <Toast.Root
        className="fixed bottom-4 right-4 p-4 rounded-md shadow-md max-w-sm bg-red-50 border border-red-200 data-[state=open]:animate-slideIn data-[state=closed]:animate-slideOut"
        open={toastOpen}
        onOpenChange={setToastOpen}
      >
        <Toast.Title className="font-medium text-red-800 flex items-center gap-2">
          <AlertCircle size={16} />
          {t("toast.error")}
        </Toast.Title>
        <Toast.Description className="text-red-700">{error}</Toast.Description>
        <Toast.Close className="absolute top-2 right-2 text-gray-400 hover:text-gray-600">×</Toast.Close>
      </Toast.Root>
      <Toast.Viewport />
    </Toast.Provider>
  );
};

export default SettingsPage;
