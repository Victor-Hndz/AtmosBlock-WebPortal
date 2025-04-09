import React from "react";
import { RequestForm } from "@/types/Request";
import { TabPlace } from "@/types/FormField";
import PopulateFormTab from "./PopulateFormTab";
import { TFunction } from "i18next";

interface BasicInfoTabProps {
  formData: RequestForm;
  updateFormField: <K extends keyof RequestForm>(field: K, value: RequestForm[K]) => void;
  handleCheckboxChange: <K extends keyof RequestForm>(
    field: K,
    value: string,
    checked: boolean | "indeterminate"
  ) => void;
  advancedMode: boolean;
  onNext: () => void;
  t: TFunction;
}

/**
 * BasicInfoTab component that uses PopulateFormTab to render the basic info form
 */
const BasicInfoTab: React.FC<BasicInfoTabProps> = ({
  formData,
  updateFormField,
  handleCheckboxChange,
  advancedMode,
  onNext,
  t
}) => {
  return (
    <PopulateFormTab
      tabName={TabPlace.BASIC_INFO}
      formData={formData}
      updateFormField={updateFormField}
      handleCheckboxChange={handleCheckboxChange}
      advancedMode={advancedMode}
      onNext={onNext}
      t={t}
    />
  );
};

export default React.memo(BasicInfoTab);
