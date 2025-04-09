import React, { useMemo } from "react";
import { RequestForm } from "@/types/Request";
import { TFunction } from "i18next";

interface RequestSummaryProps {
  formData: RequestForm;
  onPrevious: () => void;
  t: TFunction;
}

/**
 * Request summary component for the final step of the request form
 */
const RequestSummary: React.FC<RequestSummaryProps> = ({ formData, onPrevious, t }) => {
  // Memoize the summary content to prevent re-renders
  const summaryContent = useMemo(() => {
    // Process the form data for display
    const years = formData.years?.join(", ") ?? "";
    const months = formData.months?.join(", ") ?? "";
    const days = formData.days?.join(", ") ?? "";
    const hours = formData.hours?.join(", ") ?? "";
    const mapTypes = formData.mapTypes?.join(", ") ?? t("common.none");
    const mapRanges = formData.mapRanges?.join(", ") ?? t("common.none");
    const mapLevels = formData.mapLevels?.join(", ") ?? t("common.none");
    const fileFormat = formData.fileFormat ?? t("common.none");

    // Create array of summary items
    const summaryItems = [
      {
        label: t("requests-form.variableName"),
        value: formData.variableName ?? t("common.none"),
      },
      {
        label: t("requests-form.years"),
        value: years,
      },
      {
        label: t("requests-form.months"),
        value: months,
      },
      {
        label: t("requests-form.days"),
        value: days,
      },
      {
        label: t("requests-form.hours"),
        value: hours,
      },
      {
        label: t("requests-form.pressureLevels"),
        value: formData.pressureLevels ?? t("common.none"),
      },
      {
        label: t("requests-form.areaCovered"),
        value: formData.areaCovered ?? t("common.none"),
      },
      {
        label: t("requests-form.mapTypes"),
        value: mapTypes,
      },
      {
        label: t("requests-form.mapRanges"),
        value: mapRanges,
      },
      {
        label: t("requests-form.mapLevels"),
        value: mapLevels,
      },
      {
        label: t("requests-form.fileFormat"),
        value: fileFormat,
      },
    ];

    // Return the list with summary items
    return (
      <div className="bg-slate-50 rounded-lg p-5 border border-slate-200">
        <p className="text-slate-700 mb-4">{t("requests-titles.reviewBeforeSubmit")}</p>

        <div className="space-y-3">
          {summaryItems.map(item => (
            <div key={item.label} className="grid grid-cols-2 gap-2">
              <div className="text-sm font-medium text-slate-700">{item.label}:</div>
              <div className="text-sm text-slate-600">{item.value}</div>
            </div>
          ))}
        </div>

        {/* Advanced options summary (only shown if enabled) */}
        {(formData.tracking ||
          formData.noCompile ||
          formData.noExecute ||
          formData.noMaps ||
          formData.animation ||
          formData.omp ||
          formData.nThreads ||
          formData.mpi ||
          formData.nProces) && (
          <div className="mt-4 pt-4 border-t border-slate-200">
            <h3 className="text-md font-medium text-slate-700 mb-3">{t("requests-form.options")}</h3>

            <div className="space-y-3">
              {formData.tracking && (
                <div className="grid grid-cols-2 gap-2">
                  <div className="text-sm font-medium text-slate-700">{t("requests-form.tracking")}:</div>
                  <div className="text-sm text-slate-600">{t("requests-form.enabled", "Enabled")}</div>
                </div>
              )}
              {formData.noCompile && (
                <div className="grid grid-cols-2 gap-2">
                  <div className="text-sm font-medium text-slate-700">{t("requests-form.skipCompilation")}:</div>
                  <div className="text-sm text-slate-600">{t("requests-form.yes", "Yes")}</div>
                </div>
              )}
              {formData.noExecute && (
                <div className="grid grid-cols-2 gap-2">
                  <div className="text-sm font-medium text-slate-700">{t("requests-form.skipExecution")}:</div>
                  <div className="text-sm text-slate-600">{t("requests-form.yes", "Yes")}</div>
                </div>
              )}
              {formData.noMaps && (
                <div className="grid grid-cols-2 gap-2">
                  <div className="text-sm font-medium text-slate-700">{t("requests-form.skipMapGeneration")}:</div>
                  <div className="text-sm text-slate-600">{t("requests-form.yes", "Yes")}</div>
                </div>
              )}
              {formData.animation && (
                <div className="grid grid-cols-2 gap-2">
                  <div className="text-sm font-medium text-slate-700">{t("requests-form.generateAnimation")}:</div>
                  <div className="text-sm text-slate-600">{t("requests-form.yes", "Yes")}</div>
                </div>
              )}
              {formData.omp && (
                <div className="grid grid-cols-2 gap-2">
                  <div className="text-sm font-medium text-slate-700">{t("requests-form.openMP")}:</div>
                  <div className="text-sm text-slate-600">{t("requests-form.enabled", "Enabled")}</div>
                </div>
              )}
              {formData.nThreads && (
                <div className="grid grid-cols-2 gap-2">
                  <div className="text-sm font-medium text-slate-700">{t("requests-form.useMultipleThreads")}:</div>
                  <div className="text-sm text-slate-600">{t("requests-form.yes", "Yes")}</div>
                </div>
              )}
              {formData.mpi && (
                <div className="grid grid-cols-2 gap-2">
                  <div className="text-sm font-medium text-slate-700">{t("requests-form.mpi")}:</div>
                  <div className="text-sm text-slate-600">{t("requests-form.enabled", "Enabled")}</div>
                </div>
              )}
              {formData.nProces && (
                <div className="grid grid-cols-2 gap-2">
                  <div className="text-sm font-medium text-slate-700">{t("requests-form.useMultipleProcesses")}:</div>
                  <div className="text-sm text-slate-600">{t("requests-form.yes", "Yes")}</div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }, [formData, t]);

  // Memoize the back button to prevent re-renders
  const backButton = useMemo(
    () => (
      <button
        type="button"
        onClick={onPrevious}
        className="mt-6 px-4 py-2 border border-slate-300 rounded-md shadow-sm text-sm font-medium text-slate-700 
                bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2
                transition-colors duration-200"
      >
        {t("buttons.back")}
      </button>
    ),
    [onPrevious, t]
  );

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-slate-900">{t("requests-titles.summary")}</h2>

      {summaryContent}
      {backButton}
    </div>
  );
};

export default React.memo(RequestSummary);
