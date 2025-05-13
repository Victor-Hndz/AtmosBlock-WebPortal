import React from "react";
import { RequestForm } from "@/types/Request";
import { TabPlace } from "@/types/FormField";
import PopulateFormTab from "./PopulateFormTab";
import { TFunction } from "i18next";

interface MapConfigTabProps {
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
 * MapConfigTab component that uses PopulateFormTab to render the map configuration form
 */
const MapConfigTab: React.FC<MapConfigTabProps> = ({
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
      tabName={TabPlace.MAP_CONFIG}
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

export default React.memo(MapConfigTab);
