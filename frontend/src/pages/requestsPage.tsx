import React, { useState } from "react";
import * as Tabs from "@radix-ui/react-tabs";
import * as Switch from "@radix-ui/react-switch";
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
  const [activeTab, setActiveTab] = useState("basic-info");
  const [advancedMode, setAdvancedMode] = useState(false);

  const dispatch = useAppDispatch();
  const formData = useAppSelector(state => state.requests.form);
  const isSubmitting = useAppSelector(state => state.requests.isSubmitting);
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
   * @param {React.FormEvent} e - The form event
   */
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    dispatch(submitRequest(formData));
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
  };

  return (
    <div className="request-container container mx-auto px-6 py-8 bg-white shadow-lg rounded-xl">
      <div className="header-container flex items-center justify-between mb-8">
        <h1 className="page-title text-3xl font-bold text-gray-800">Create New Request</h1>
        <div className="mode-toggle flex items-center">
          <label htmlFor="advanced-mode" className="mode-label mr-3 text-sm font-medium text-gray-600">
            Advanced Mode
          </label>
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
              className="help-button ml-2 text-gray-400 hover:text-gray-600 transition-colors duration-200"
              aria-label="Advanced mode help"
            >
              <HelpCircle size={16} />
            </button>
          </Tooltip>
        </div>
      </div>

      {!isAuthenticated && (
        <div
          className="auth-alert bg-amber-50 border-l-4 border-amber-400 p-4 mb-8 rounded-md animate-pulse"
          role="alert"
        >
          <div className="alert-content flex">
            <AlertCircle className="h-5 w-5 text-yellow-400" />
            <p className="ml-3 text-sm text-yellow-700">
              You are not logged in. Your request will be processed anonymously.
            </p>
          </div>
        </div>
      )}

      <Tabs.Root value={activeTab} onValueChange={setActiveTab} className="tabs-container w-full">
        <Tabs.List
          className="tabs-list flex border-b border-gray-200 mb-8 overflow-x-auto"
          aria-label="Request form steps"
        >
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

        <form onSubmit={handleSubmit} className="form-container space-y-6">
          <Tabs.Content value="basic-info" className="tab-content">
            <BasicInfoForm
              formData={formData}
              updateFormField={updateField}
              onNext={() => setActiveTab("map-config")}
            />
          </Tabs.Content>

          <Tabs.Content value="map-config" className="tab-content">
            <MapConfigForm
              formData={formData}
              updateFormField={updateField}
              onNext={() => setActiveTab("advanced-settings")}
              onPrevious={() => setActiveTab("basic-info")}
            />
          </Tabs.Content>

          <Tabs.Content value="advanced-settings" className="tab-content">
            <AdvancedSettingsForm
              formData={formData}
              updateFormField={updateField}
              advancedMode={advancedMode}
              onNext={() => setActiveTab("summary")}
              onPrevious={() => setActiveTab("map-config")}
            />
          </Tabs.Content>

          <Tabs.Content value="summary" className="tab-content">
            <RequestSummary formData={formData} onPrevious={() => setActiveTab("advanced-settings")} />

            <div className="actions-container flex justify-end gap-4 mt-8">
              <button
                type="button"
                onClick={handleClear}
                className="secondary-button px-6 py-3 border border-gray-300 rounded-lg shadow-sm text-base font-medium text-gray-700 bg-white hover:bg-gray-50 min-w-[120px]"
                disabled={isSubmitting}
              >
                Clear All
              </button>
              <button
                type="submit"
                className="primary-button px-6 py-3 border border-transparent rounded-lg shadow-sm text-base font-medium text-white bg-violet-600 hover:bg-violet-700 flex items-center justify-center min-w-[140px]"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="animate-spin mr-2" size={16} />
                    Submitting...
                  </>
                ) : (
                  "Submit Request"
                )}
              </button>
            </div>
          </Tabs.Content>
        </form>
      </Tabs.Root>
    </div>
  );
};

export default RequestsPage;
