import React, { useState } from "react";
import * as Tabs from "@radix-ui/react-tabs";
import * as Switch from "@radix-ui/react-switch";
import { AlertCircle, HelpCircle } from "lucide-react";
import { Tooltip } from "@/components/ui/Tooltip";
import BasicInfoForm from "@/components/requests/BasicInfoForm";
import MapConfigForm from "@/components/requests/MapConfigForm";
import AdvancedSettingsForm from "@/components/requests/AdvancedSettingsForm";
import RequestSummary from "@/components/requests/RequestSummary";
import { useAuth } from "@/hooks/useAuth";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { updateFormField, submitRequest } from "@/redux/slices/requestsSlice";

/**
 * RequestsPage component for handling user requests.
 * Contains a multi-step form for submitting requests.
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
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Create New Request</h1>
        <div className="flex items-center">
          <label htmlFor="advanced-mode" className="mr-2 text-sm">
            Advanced Mode
          </label>
          <Switch.Root
            id="advanced-mode"
            checked={advancedMode}
            onCheckedChange={setAdvancedMode}
            className="w-10 h-5 bg-gray-300 rounded-full relative data-[state=checked]:bg-blue-600"
          >
            <Switch.Thumb className="block w-4 h-4 bg-white rounded-full transition-transform duration-100 transform translate-x-0.5 will-change-transform data-[state=checked]:translate-x-5" />
          </Switch.Root>
          <Tooltip content="Enable advanced mode to access additional configuration options">
            <button className="ml-1">
              <HelpCircle size={16} />
            </button>
          </Tooltip>
        </div>
      </div>

      {!isAuthenticated && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <AlertCircle className="h-5 w-5 text-yellow-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                You are not logged in. Your request will be processed anonymously.
              </p>
            </div>
          </div>
        </div>
      )}

      <Tabs.Root value={activeTab} onValueChange={setActiveTab} className="w-full">
        <Tabs.List className="flex border-b border-gray-200 mb-6" aria-label="Request form steps">
          <Tabs.Trigger
            value="basic-info"
            className="px-4 py-2 border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:text-blue-600"
          >
            1. Basic Information
          </Tabs.Trigger>
          <Tabs.Trigger
            value="map-config"
            className="px-4 py-2 border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:text-blue-600"
          >
            2. Map Configuration
          </Tabs.Trigger>
          <Tabs.Trigger
            value="advanced-settings"
            className="px-4 py-2 border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:text-blue-600"
          >
            3. Advanced Settings
          </Tabs.Trigger>
          <Tabs.Trigger
            value="summary"
            className="px-4 py-2 border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:text-blue-600"
          >
            4. Summary
          </Tabs.Trigger>
        </Tabs.List>

        <form onSubmit={handleSubmit}>
          <Tabs.Content value="basic-info">
            <BasicInfoForm
              formData={formData}
              updateFormField={updateField}
              onNext={() => setActiveTab("map-config")}
            />
          </Tabs.Content>

          <Tabs.Content value="map-config">
            <MapConfigForm
              formData={formData}
              updateFormField={updateField}
              onNext={() => setActiveTab("advanced-settings")}
              onPrevious={() => setActiveTab("basic-info")}
            />
          </Tabs.Content>

          <Tabs.Content value="advanced-settings">
            <AdvancedSettingsForm
              formData={formData}
              updateFormField={updateField}
              advancedMode={advancedMode}
              onNext={() => setActiveTab("summary")}
              onPrevious={() => setActiveTab("map-config")}
            />
          </Tabs.Content>

          <Tabs.Content value="summary">
            <RequestSummary formData={formData} onPrevious={() => setActiveTab("advanced-settings")} />

            <div className="flex justify-end gap-4 mt-6">
              <button
                type="button"
                onClick={handleClear}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                disabled={isSubmitting}
              >
                Clear All
              </button>
              <button
                type="submit"
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Submitting..." : "Submit Request"}
              </button>
            </div>
          </Tabs.Content>
        </form>
      </Tabs.Root>
    </div>
  );
};

export default RequestsPage;
