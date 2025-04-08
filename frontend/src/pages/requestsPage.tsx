import React, { useState } from "react";
import * as Tabs from "@radix-ui/react-tabs";
import * as Switch from "@radix-ui/react-switch";
import * as Separator from "@radix-ui/react-separator";
import * as Toast from "@radix-ui/react-toast";
import { AlertCircle, HelpCircle, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Tooltip } from "@/components/ui/Tooltip";
import BasicInfoForm from "@/components/requests/BasicInfoForm";
import MapConfigForm from "@/components/requests/MapConfigForm";
import AdvancedSettingsForm from "@/components/requests/AdvancedSettingsForm";
import RequestSummary from "@/components/requests/RequestSummary";
import { useAuth } from "@/hooks/useAuth";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { updateFormField, submitRequest } from "@/redux/slices/requestsSlice";
import "./requestsPage.css";

/**
 * RequestsPage component for handling user requests.
 * Contains a multi-step form for submitting requests with modern UI elements.
 * @returns {JSX.Element} The RequestsPage component.
 */
const RequestsPage: React.FC = () => {
  const { t } = useTranslation();

  // State management
  const [activeTab, setActiveTab] = useState("basic-info");
  const [advancedMode, setAdvancedMode] = useState(false);
  const [toastOpen, setToastOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  // Redux hooks
  const dispatch = useAppDispatch();
  const formData = useAppSelector(state => state.requests.form);
  const isSubmitting = useAppSelector(state => state.requests.isSubmitting);

  // Authentication hook
  const { isAuthenticated } = useAuth();

  /**
   * Updates a specific form field value
   * @param {string} field - The field name to update
   * @param {any} value - The new value for the field
   */
  const updateField = <K extends keyof typeof formData>(field: K, value: (typeof formData)[K]) => {
    dispatch(updateFormField({ field, value }));
  };

  /**
   * Transforms the form data into the format expected by the API
   * @returns Transformed data ready for submission
   */
  const transformFormDataForSubmission = () => {
    if (!formData.variableName || !formData.years || !formData.months || !formData.days) {
      throw new Error(t("errors.missingRequiredFields", "Missing required fields"));
    }

    // Convert selected year, month, day to numbers
    const year = parseInt(formData.years[0], 10);
    const month = formData.months[0] ? formData.months.indexOf(formData.months[0]) + 1 : 1; // Convert month name to number (1-12)
    const day = parseInt(formData.days[0], 10);

    // Convert pressure levels from strings to numbers
    const numericPressureLevels =
      formData.pressureLevels?.map(level => {
        // Extract number from format like "500hPa"
        return parseInt(level.replace(/\D/g, ""), 10);
      }) || [];

    // Create area covered object from the string selections
    const areaCoveredObj = {
      north: 90, // Default values
      south: -90,
      east: 180,
      west: -180,
    };

    // Could be enhanced with actual coordinates based on the selected areas
    if (formData.areaCovered?.includes("Northern Hemisphere")) {
      areaCoveredObj.south = 0;
    }
    if (formData.areaCovered?.includes("Southern Hemisphere")) {
      areaCoveredObj.north = 0;
    }
    if (formData.areaCovered?.includes("Europe")) {
      areaCoveredObj.north = 75;
      areaCoveredObj.south = 35;
      areaCoveredObj.east = 40;
      areaCoveredObj.west = -10;
    }
    // Add other regions as needed

    return {
      variableName: formData.variableName,
      date: {
        year,
        month,
        day,
      },
      pressureLevels: numericPressureLevels,
      areaCovered: areaCoveredObj,
      format: formData.fileFormat,
    };
  };

  /**
   * Handles form submission
   */
  const handleSubmit = () => {
    try {
      const transformedData = transformFormDataForSubmission();
      dispatch(submitRequest(transformedData))
        .unwrap()
        .then(() => {
          setToastMessage(t("requests-titles.success"));
          setToastOpen(true);
        })
        .catch(error => {
          setToastMessage(`${t("errors.title")}: ${error.message || t("errors.submission")}`);
          setToastOpen(true);
        });
    } catch (error) {
      setToastMessage(`${t("errors.title")}: ${error instanceof Error ? error.message : t("errors.submission")}`);
      setToastOpen(true);
    }
  };

  /**
   * Clears all form fields
   */
  const handleClear = () => {
    // Using the local state approach for clearing form data
    Object.keys(formData).forEach(key => {
      const field = key as keyof typeof formData;
      let value;

      if (Array.isArray(formData[field])) {
        value = [];
      } else if (typeof formData[field] === "boolean") {
        value = false;
      } else {
        value = "";
      }

      updateField(field, value as (typeof formData)[keyof typeof formData]);
    });

    setToastMessage(t("requests-titles.clearSuccess", "Form cleared successfully"));
    setToastOpen(true);
  };

  /**
   * Navigate to the next tab
   * @param {string} currentTab - The current tab ID
   */
  const goToNextTab = (currentTab: string) => {
    const tabOrder = ["basic-info", "map-config", "advanced-settings", "summary"];
    const currentIndex = tabOrder.indexOf(currentTab);

    if (currentIndex < tabOrder.length - 1) {
      setActiveTab(tabOrder[currentIndex + 1]);
    }
  };

  /**
   * Navigate to the previous tab
   * @param {string} currentTab - The current tab ID
   */
  const goToPreviousTab = (currentTab: string) => {
    const tabOrder = ["basic-info", "map-config", "advanced-settings", "summary"];
    const currentIndex = tabOrder.indexOf(currentTab);

    if (currentIndex > 0) {
      setActiveTab(tabOrder[currentIndex - 1]);
    }
  };

  return (
    <div className="request-container container mx-auto px-4 sm:px-6 py-6 sm:py-8 bg-white shadow-lg rounded-xl">
      <div className="header-container flex items-center justify-between">
        <h1 className="page-title">{t("requests-titles.title")}</h1>

        <div className="mode-toggle">
          <label htmlFor="advanced-mode" className="mode-label text-sm font-medium text-slate-700">
            {t("requests-form.advancedMode", "Advanced Mode")}
          </label>

          <div className="flex items-center gap-2">
            <Switch.Root
              id="advanced-mode"
              checked={advancedMode}
              onCheckedChange={setAdvancedMode}
              className="switch-root"
              aria-label={t("requests-form.toggleAdvancedMode", "Toggle advanced mode")}
            >
              <Switch.Thumb className="switch-thumb" />
            </Switch.Root>

            <Tooltip
              content={t(
                "requests-form.advancedModeTooltip",
                "Enable advanced mode to access additional configuration options"
              )}
            >
              <button
                type="button"
                className="text-slate-400 hover:text-slate-600 transition-colors duration-200"
                aria-label={t("navigation-tooltips.help", "Help")}
              >
                <HelpCircle size={16} />
              </button>
            </Tooltip>
          </div>
        </div>
      </div>

      {!isAuthenticated && (
        <div className="auth-alert bg-amber-50 border-l-4 border-amber-400 p-4 mb-6 rounded-md" role="alert">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-amber-500 flex-shrink-0" />
            <p className="ml-3 text-sm text-amber-800 font-medium">
              {t(
                "requests-form.anonymousWarning",
                "You are not logged in. Your request will be processed anonymously."
              )}
            </p>
          </div>
        </div>
      )}

      <Tabs.Root value={activeTab} onValueChange={setActiveTab} className="tabs-container w-full">
        <Tabs.List className="tabs-list flex" aria-label={t("requests-form.formSteps", "Request form steps")}>
          <Tabs.Trigger value="basic-info" className="tab-trigger">
            1. {t("requests-titles.basicInfo")}
          </Tabs.Trigger>
          <Tabs.Trigger value="map-config" className="tab-trigger">
            2. {t("requests-titles.mapConfig")}
          </Tabs.Trigger>
          <Tabs.Trigger value="advanced-settings" className="tab-trigger">
            3. {t("requests-titles.advancedSettings")}
          </Tabs.Trigger>
          <Tabs.Trigger value="summary" className="tab-trigger">
            4. {t("requests-titles.summary", "Summary")}
          </Tabs.Trigger>
        </Tabs.List>

        <div className="form-container">
          <Tabs.Content value="basic-info" className="tab-content">
            <BasicInfoForm formData={formData} updateFormField={updateField} onNext={() => goToNextTab("basic-info")} />
          </Tabs.Content>
          <Tabs.Content value="map-config" className="tab-content">
            <MapConfigForm
              formData={formData}
              updateFormField={updateField}
              onNext={() => goToNextTab("map-config")}
              onPrevious={() => goToPreviousTab("map-config")}
            />
          </Tabs.Content>
          <Tabs.Content value="advanced-settings" className="tab-content">
            <AdvancedSettingsForm
              formData={formData}
              updateFormField={updateField}
              advancedMode={advancedMode}
              onNext={() => goToNextTab("advanced-settings")}
              onPrevious={() => goToPreviousTab("advanced-settings")}
            />
          </Tabs.Content>
          <Tabs.Content value="summary" className="tab-content">
            <RequestSummary formData={formData} onPrevious={() => goToPreviousTab("summary")} />

            <Separator.Root className="h-px bg-slate-200 my-6" />

            <div className="actions-container">
              <button
                type="button"
                onClick={handleClear}
                className="secondary-button flex items-center justify-center"
                disabled={isSubmitting}
                aria-label={t("requests-titles.clear")}
              >
                {t("requests-titles.clear")}
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                className="primary-button flex items-center justify-center"
                disabled={isSubmitting}
                aria-label={t("requests-titles.submit")}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="animate-spin mr-2" size={18} />
                    <span>{t("requests-form.submitting", "Submitting...")}</span>
                  </>
                ) : (
                  t("requests-titles.submit")
                )}
              </button>
            </div>
          </Tabs.Content>
        </div>
      </Tabs.Root>

      {/* Toast notifications for form actions */}
      <Toast.Provider swipeDirection="right">
        <Toast.Root
          className="bg-white rounded-lg shadow-lg p-4 flex items-start gap-3 border border-slate-200 fixed bottom-4 right-4 max-w-sm"
          open={toastOpen}
          onOpenChange={setToastOpen}
          duration={5000}
        >
          <Toast.Title className="font-medium text-slate-900">
            {toastMessage.startsWith(t("errors.title")) ? t("errors.title") : t("requests-form.success", "Success")}
          </Toast.Title>
          <Toast.Description className="text-sm text-slate-600 mt-1">{toastMessage}</Toast.Description>
          <Toast.Action className="ml-auto" asChild altText={t("buttons.close")}>
            <button className="text-slate-400 hover:text-slate-600 rounded-full p-1" aria-label={t("buttons.close")}>
              &times;
            </button>
          </Toast.Action>
        </Toast.Root>
        <Toast.Viewport className="fixed bottom-0 right-0 flex flex-col p-4 gap-2 w-full max-w-sm z-50" />
      </Toast.Provider>
    </div>
  );
};

export default RequestsPage;
