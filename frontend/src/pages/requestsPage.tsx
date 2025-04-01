import React, { useState } from "react";
import * as Tabs from "@radix-ui/react-tabs";
import * as Switch from "@radix-ui/react-switch";
import * as Separator from "@radix-ui/react-separator";
import * as Toast from "@radix-ui/react-toast";
import { AlertCircle, HelpCircle, Loader2 } from "lucide-react";
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
   * Handles form submission
   */
  const handleSubmit = () => {
    dispatch(submitRequest(formData))
      .unwrap()
      .then(() => {
        setToastMessage("Request submitted successfully!");
        setToastOpen(true);
      })
      .catch(error => {
        setToastMessage(`Error: ${error.message || "Failed to submit request"}`);
        setToastOpen(true);
      });
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

    setToastMessage("Form cleared successfully");
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
        <h1 className="page-title">Create New Request</h1>

        <div className="mode-toggle">
          <label htmlFor="advanced-mode" className="mode-label text-sm font-medium text-slate-700">
            Advanced Mode
          </label>

          <div className="flex items-center gap-2">
            <Switch.Root
              id="advanced-mode"
              checked={advancedMode}
              onCheckedChange={setAdvancedMode}
              className="switch-root"
              aria-label="Toggle advanced mode"
            >
              <Switch.Thumb className="switch-thumb" />
            </Switch.Root>

            <Tooltip content="Enable advanced mode to access additional configuration options">
              <button
                type="button"
                className="text-slate-400 hover:text-slate-600 transition-colors duration-200"
                aria-label="Advanced mode help"
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
              You are not logged in. Your request will be processed anonymously.
            </p>
          </div>
        </div>
      )}

      <Tabs.Root value={activeTab} onValueChange={setActiveTab} className="tabs-container w-full">
        <Tabs.List className="tabs-list flex" aria-label="Request form steps">
          <Tabs.Trigger value="basic-info" className="tab-trigger">
            1. Basic Information
          </Tabs.Trigger>
          <Tabs.Trigger value="map-config" className="tab-trigger">
            2. Map Configuration
          </Tabs.Trigger>
          <Tabs.Trigger value="advanced-settings" className="tab-trigger">
            3. Advanced Settings
          </Tabs.Trigger>
          <Tabs.Trigger value="summary" className="tab-trigger">
            4. Summary
          </Tabs.Trigger>
        </Tabs.List>

        <div className="form-container">
          {" "}
          {/* Changed from <form> to <div> */}
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
                aria-label="Clear all form fields"
              >
                Clear All
              </button>
              <button
                type="button" // Changed from type="submit" to type="button"
                onClick={handleSubmit}
                className="primary-button flex items-center justify-center"
                disabled={isSubmitting}
                aria-label="Submit request"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="animate-spin mr-2" size={18} />
                    <span>Submitting...</span>
                  </>
                ) : (
                  "Submit Request"
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
            {toastMessage.startsWith("Error") ? "Error" : "Success"}
          </Toast.Title>
          <Toast.Description className="text-sm text-slate-600 mt-1">{toastMessage}</Toast.Description>
          <Toast.Action className="ml-auto" asChild altText="Close toast">
            <button className="text-slate-400 hover:text-slate-600 rounded-full p-1" aria-label="Close notification">
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
