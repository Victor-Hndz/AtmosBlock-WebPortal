import React, { useMemo } from "react";
import { RequestForm } from "@/types/Request";
import { TFunction } from "i18next";
import { capitalize, extractMonthNames } from "@/utils/utilities";

interface RequestSummaryProps {
  formData: RequestForm;
  onPrevious: () => void;
  t: TFunction;
}

const formatMonths = (months: string[] | undefined, t: TFunction): string => {
  return extractMonthNames(months ?? [])
    .map(month => t(`months-list.${month.toLowerCase()}` as any))
    .join(", ");
};

const formatDays = (days: string[] | undefined, t: TFunction): string => {
  if (!days || days.length === 0) return t("common.none");
  return days
    .map(day => {
      const num = Number(day);
      return num < 10 ? `0${num}` : `${num}`;
    })
    .join(", ");
};

const formatHours = (hours: string[] | undefined, t: TFunction): string => {
  if (!hours || hours.length === 0) return t("common.none");
  return hours
    .map(hour => {
      const num = Number(hour);
      return num < 10 ? `0${num}:00` : `${num}:00`;
    })
    .join(", ");
};

const formatPressureLevels = (levels: string[] | undefined, t: TFunction): string => {
  if (!levels || levels.length === 0) return t("common.none");
  return levels
    .map(level => {
      const num = Number(level);
      return `${num}hPa`;
    })
    .join(", ");
};

const formatAreaCovered = (area: string[] | undefined, t: TFunction): string => {
  if (!area || area.length === 0) return t("common.none");
  return area.join(", ");
};

const formatMapTypes = (mapTypes: string[] | undefined, t: TFunction): string => {
  if (!mapTypes || mapTypes.length === 0) return t("common.none");
  return mapTypes.map(type => t(`mapTypes-list.${type.toLowerCase()}` as any)).join(", ");
};

/**
 * Request summary component for the final step of the request form
 */
const RequestSummary: React.FC<RequestSummaryProps> = ({ formData, onPrevious, t }) => {
  // Memoize the summary content to prevent re-renders
  const summaryContent = useMemo(() => {
    // Process the form data for display
    const years = formData.years?.join(", ") ?? "";
    const months = formData.months;
    const days = formData.days;
    const hours = formData.hours;
    const mapTypes = formData.mapTypes;
    const fileFormat = formData.fileFormat ?? t("common.none");

    // Create array of summary items
    const summaryItems = [
      {
        label: t("requests-form.variableName"),
        value: capitalize(formData.variableName ?? "") || t("common.none"),
      },
      {
        label: t("requests-form.years"),
        value: years || t("common.none"),
      },
      {
        label: t("requests-form.months"),
        value: formatMonths(months, t) || t("common.none"),
      },
      {
        label: t("requests-form.days"),
        value: formatDays(days, t),
      },
      {
        label: t("requests-form.hours"),
        value: formatHours(hours, t),
      },
      {
        label: t("requests-form.pressureLevels"),
        value: formatPressureLevels(formData.pressureLevels, t) || t("common.none"),
      },
      {
        label: t("requests-form.areaCovered"),
        value: formatAreaCovered(formData.areaCovered, t) || t("common.none"),
      },
      {
        label: t("requests-form.mapTypes"),
        value: formatMapTypes(mapTypes, t) || t("common.none"),
      },
      {
        label: t("requests-form.fileFormat"),
        value: fileFormat.toUpperCase() || t("common.none"),
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
        {((formData.mapLevels && formData.mapLevels.length > 0) ||
          formData.noData ||
          formData.noMaps ||
          formData.omp ||
          formData.nThreads ||
          formData.mpi ||
          formData.nProces) && (
          <div className="mt-4 pt-4 border-t border-slate-200">
            <h3 className="text-md font-medium text-slate-700 mb-3">{t("requests-form.options")}</h3>

            <div className="space-y-3">
              {formData.noData && (
                <div className="grid grid-cols-2 gap-2">
                  <div className="text-sm font-medium text-slate-700">{t("requests-form.skipData")}:</div>
                  <div className="text-sm text-slate-600">{t("requests-form.yes", "Yes")}</div>
                </div>
              )}
              {formData.mapLevels && (
                <div className="grid grid-cols-2 gap-2">
                  <div className="text-sm font-medium text-slate-700">{t("requests-form.mapLevels")}:</div>
                  <div className="text-sm text-slate-600">{formData.mapLevels.join(", ")}</div>
                </div>
              )}
              {formData.noMaps && (
                <div className="grid grid-cols-2 gap-2">
                  <div className="text-sm font-medium text-slate-700">{t("requests-form.skipMapGeneration")}:</div>
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
