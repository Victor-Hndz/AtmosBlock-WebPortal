import React, { useMemo } from "react";
import { Loader2 } from "lucide-react";
import { TFunction } from "i18next";
import * as Tabs from "@radix-ui/react-tabs";
import * as Separator from "@radix-ui/react-separator";
import { useRequestForm } from "@/hooks/useRequestForm";
import { useRequestNavigation } from "@/hooks/useRequestNavigation";
import { useNavigate } from "react-router-dom";
import RequestSummary from "@/components/requests/RequestSummary";
import { REQUEST_FORM_STEPS } from "@/consts/requestsConsts";
import PopulateFormTab from "./PopulateFormTab";
import { TabPlace } from "@/types/FormField";

interface FormTabsWrapperProps {
  advancedMode: boolean;
  showToast: (message: string, type: "success" | "error" | "info") => void;
  t: TFunction;
}

const FormTabsWrapper: React.FC<FormTabsWrapperProps> = ({ advancedMode, showToast, t }) => {
  // Add navigate hook
  const navigate = useNavigate();

  // Custom hooks for form functionality
  const { formData, isSubmitting, updateField, handleSubmit, clearForm, handleCheckboxChange } = useRequestForm(t);
  const { activeTab, setActiveTab, goToNextTab, goToPreviousTab } = useRequestNavigation();

  // Handle form submission
  const onSubmit = async () => {
    const result = await handleSubmit();
    showToast(result.message, result.success ? "success" : "error");

    // If submission was successful and we have a request hash, navigate to results page
    if (result.success && result.requestHash) {
      navigate(`/results?requestHash=${result.requestHash}`);
    }
  };

  // Handle form clearing
  const onClear = () => {
    const result = clearForm();
    showToast(result.message, result.success ? "success" : "info");
  };

  // Memoize form components to prevent needless re-renders
  const basicInfoForm = useMemo(
    () => (
      <PopulateFormTab
        tabName={TabPlace.BASIC_INFO}
        formData={formData}
        updateFormField={updateField}
        handleCheckboxChange={handleCheckboxChange}
        advancedMode={advancedMode}
        onNext={() => goToNextTab("basicInfo")}
        t={t}
      />
    ),
    [formData, updateField, handleCheckboxChange, advancedMode, goToNextTab, t]
  );

  const mapConfigForm = useMemo(
    () => (
      <PopulateFormTab
        tabName={TabPlace.MAP_CONFIG}
        formData={formData}
        updateFormField={updateField}
        handleCheckboxChange={handleCheckboxChange}
        advancedMode={advancedMode}
        onNext={() => goToNextTab("mapConfig")}
        onPrevious={() => goToPreviousTab("mapConfig")}
        t={t}
      />
    ),
    [formData, updateField, handleCheckboxChange, advancedMode, goToNextTab, goToPreviousTab, t]
  );

  const additionalSettingsForm = useMemo(
    () => (
      <PopulateFormTab
        tabName={TabPlace.ADDITIONAL_SETTINGS}
        formData={formData}
        updateFormField={updateField}
        handleCheckboxChange={handleCheckboxChange}
        advancedMode={advancedMode}
        onNext={() => goToNextTab("additionalSettings")}
        onPrevious={() => goToPreviousTab("additionalSettings")}
        t={t}
      />
    ),
    [formData, updateField, handleCheckboxChange, advancedMode, goToNextTab, goToPreviousTab, t]
  );

  const requestSummary = useMemo(
    () => <RequestSummary formData={formData} onPrevious={() => goToPreviousTab("summary")} t={t} />,
    [formData, goToPreviousTab, t]
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
        <Tabs.Content value="basicInfo" className="tab-content">
          {basicInfoForm}
        </Tabs.Content>
        <Tabs.Content value="mapConfig" className="tab-content">
          {mapConfigForm}
        </Tabs.Content>
        <Tabs.Content value="additionalSettings" className="tab-content">
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
