import React, { useMemo } from "react";
import { Loader2 } from "lucide-react";
import { TFunction } from "i18next";
import * as Tabs from "@radix-ui/react-tabs";
import * as Separator from "@radix-ui/react-separator";
import { useRequestForm } from "@/hooks/useRequestForm";
import { useRequestNavigation } from "@/hooks/useRequestNavigation";
import RequestSummary from "@/components/requests/RequestSummary";
import BasicInfoTab from "@/components/requests/BasicInfoTab";
import MapConfigTab from "@/components/requests/MapConfigTab";
import AdditionalSettingsTab from "@/components/requests/AdditionalSettingsTab";
import { REQUEST_FORM_STEPS } from "@/consts/requestsConsts";

interface FormTabsWrapperProps {
  advancedMode: boolean;
  showToast: (message: string, type: "success" | "error" | "info") => void;
  t: TFunction;
}

const FormTabsWrapper: React.FC<FormTabsWrapperProps> = ({ advancedMode, showToast, t }) => {
  // Custom hooks for form functionality
  const { formData, isSubmitting, updateField, handleSubmit, clearForm, handleCheckboxChange } = useRequestForm(t);
  const { activeTab, setActiveTab, goToNextTab, goToPreviousTab } = useRequestNavigation();

  // Handle form submission
  const onSubmit = async () => {
    const result = await handleSubmit();
    showToast(result.message, result.success ? "success" : "error");
  };

  // Handle form clearing
  const onClear = () => {
    const result = clearForm();
    showToast(result.message, result.success ? "success" : "info");
  };

  // Memoize form components to prevent needless re-renders
  const basicInfoForm = useMemo(
    () => (
      <BasicInfoTab
        formData={formData}
        updateFormField={updateField}
        handleCheckboxChange={handleCheckboxChange}
        advancedMode={advancedMode}
        onNext={() => goToNextTab("basic-info")}
      />
    ),
    [formData, updateField, handleCheckboxChange, advancedMode, goToNextTab]
  );

  const mapConfigForm = useMemo(
    () => (
      <MapConfigTab
        formData={formData}
        updateFormField={updateField}
        handleCheckboxChange={handleCheckboxChange}
        advancedMode={advancedMode}
        onNext={() => goToNextTab("map-config")}
        onPrevious={() => goToPreviousTab("map-config")}
      />
    ),
    [formData, updateField, handleCheckboxChange, advancedMode, goToNextTab, goToPreviousTab]
  );

  const additionalSettingsForm = useMemo(
    () => (
      <AdditionalSettingsTab
        formData={formData}
        updateFormField={updateField}
        handleCheckboxChange={handleCheckboxChange}
        advancedMode={advancedMode}
        onNext={() => goToNextTab("additional-settings")}
        onPrevious={() => goToPreviousTab("additional-settings")}
      />
    ),
    [formData, updateField, handleCheckboxChange, advancedMode, goToNextTab, goToPreviousTab]
  );

  const requestSummary = useMemo(
    () => <RequestSummary formData={formData} onPrevious={() => goToPreviousTab("summary")} />,
    [formData, goToPreviousTab]
  );

  return (
    <Tabs.Root value={activeTab} onValueChange={setActiveTab} className="tabs-container w-full">
      <Tabs.List className="tabs-list flex" aria-label={t("requests-form.formSteps", "Request form steps")}>
        {REQUEST_FORM_STEPS.map((step, index) => (
          <Tabs.Trigger key={step} value={step} className="tab-trigger">
            {index + 1}. {t(`requests-titles.${step.replace("-", "")}`, step)}
          </Tabs.Trigger>
        ))}
      </Tabs.List>

      <div className="form-container">
        <Tabs.Content value="basic-info" className="tab-content">
          {basicInfoForm}
        </Tabs.Content>
        <Tabs.Content value="map-config" className="tab-content">
          {mapConfigForm}
        </Tabs.Content>
        <Tabs.Content value="additional-settings" className="tab-content">
          {additionalSettingsForm}
        </Tabs.Content>
        <Tabs.Content value="summary" className="tab-content">
          {requestSummary}

          <Separator.Root className="h-px bg-slate-200 my-6" />

          <div className="actions-container">
            <button
              type="button"
              onClick={onClear}
              className="secondary-button flex items-center justify-center"
              disabled={isSubmitting}
              aria-label={t("requests-titles.clear")}
            >
              {t("requests-titles.clear")}
            </button>
            <button
              type="button"
              onClick={onSubmit}
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
  );
};

export default React.memo(FormTabsWrapper);
