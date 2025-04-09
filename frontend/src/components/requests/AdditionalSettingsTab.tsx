import React from "react";
import { RequestForm } from "@/types/Request";
import { TabPlace } from "@/types/FormField";
import PopulateFormTab from "./PopulateFormTab";
import { TFunction } from "i18next";

interface AdditionalSettingsTabProps {
  formData: RequestForm;
  updateFormField: <K extends keyof RequestForm>(field: K, value: RequestForm[K]) => void;
  handleCheckboxChange: <K extends keyof RequestForm>(
    field: K,
    value: string,
    checked: boolean | "indeterminate"
  ) => void;
  advancedMode: boolean;
  onNext: () => void;
  onPrevious: () => void;
  t: TFunction;
}

/**
 * AdditionalSettingsTab component that uses PopulateFormTab to render additional settings form
 * This replaces the previous AdvancedSettingsForm component with a more dynamic approach
 */
const AdditionalSettingsTab: React.FC<AdditionalSettingsTabProps> = ({
  formData,
  updateFormField,
  handleCheckboxChange,
  advancedMode,
  onNext,
  onPrevious,
  t,
}) => {
  return (
    <PopulateFormTab
      tabName={TabPlace.ADDITIONAL_SETTINGS}
      formData={formData}
      updateFormField={updateFormField}
      handleCheckboxChange={handleCheckboxChange}
      advancedMode={advancedMode}
      onNext={onNext}
      onPrevious={onPrevious}
      t={t}
    />
  );
};

export default React.memo(AdditionalSettingsTab);
