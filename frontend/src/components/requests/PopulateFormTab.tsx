import React, { useState, useCallback, useMemo } from "react";
import { RequestForm } from "@/types/Request";
import { TabPlace } from "@/types/FormField";
import { getFormFieldsForTab } from "@/consts/formFieldsConfig";
import DynamicFormField from "./DynamicFormField";
import { TFunction } from "i18next";

interface PopulateFormTabProps {
  tabName: TabPlace;
  formData: RequestForm;
  updateFormField: <K extends keyof RequestForm>(field: K, value: RequestForm[K]) => void;
  handleCheckboxChange: <K extends keyof RequestForm>(
    field: K,
    value: string,
    checked: boolean | "indeterminate"
  ) => void;
  advancedMode: boolean;
  onNext: () => void;
  onPrevious?: () => void;
  t: TFunction;
}

/**
 * PopulateFormTab component that dynamically generates form fields for a tab
 */
const PopulateFormTab: React.FC<PopulateFormTabProps> = ({
  tabName,
  formData,
  updateFormField,
  handleCheckboxChange,
  advancedMode,
  onNext,
  onPrevious,
  t,
}) => {
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Get form fields for this tab
  const formFields = useMemo(() => getFormFieldsForTab(tabName, advancedMode), [tabName, advancedMode]);

  /**
   * Validates the form fields before proceeding to the next step
   * @returns {boolean} True if validation passes, false otherwise
   */
  const validateForm = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};
    let isValid = true;

    formFields.forEach(field => {
      // Skip validation for optional fields
      if (field.optionalField) return;

      // Check required fields
      if (field.validation?.required) {
        const value = formData[field.name];

        if (!value || (Array.isArray(value) && value.length === 0)) {
          newErrors[field.name as string] = t("requests-form.required");
          isValid = false;
        }
      }

      // Add more validations as needed
    });

    setErrors(newErrors);
    return isValid;
  }, [formData, formFields, t]);

  /**
   * Handles clicking the next button
   */
  const handleNextClick = useCallback(() => {
    if (validateForm()) {
      onNext();
    }
  }, [validateForm, onNext]);

  // Memoize the navigation buttons to prevent re-renders
  const navigationButtons = useMemo(
    () => (
      <div className="flex justify-between">
        {onPrevious && (
          <button
            type="button"
            onClick={onPrevious}
            className="px-4 py-2 border border-slate-300 rounded-md shadow-sm text-sm font-medium text-slate-700 
                    bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2
                    transition-colors duration-200"
          >
            {t("buttons.back")}
          </button>
        )}
        <div className={onPrevious ? "" : "ml-auto"}>
          <button
            type="button"
            onClick={handleNextClick}
            className="px-4 py-2 bg-violet-600 text-white rounded-md hover:bg-violet-700 
                    focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2
                    transition-colors duration-200"
          >
            {t("buttons.next", "Next")}
          </button>
        </div>
      </div>
    ),
    [onPrevious, handleNextClick, t]
  );

  // Determine the title based on the tab name
  const getTitle = (): string => {
    switch (tabName) {
      case TabPlace.BASIC_INFO:
        return t("requests-titles.basicInfo");
      case TabPlace.MAP_CONFIG:
        return t("requests-titles.mapConfig");
      case TabPlace.ADDITIONAL_SETTINGS:
        return t("requests-titles.additionalSettings", "Additional Settings");
      default:
        return "";
    }
  };

  // Render additional sections like parallel processing options
  const renderAdditionalSections = () => {
    if (tabName === TabPlace.ADDITIONAL_SETTINGS && advancedMode) {
      return (
        <div className="border-t border-slate-200 pt-4 mt-4">
          <h3 className="text-lg font-medium mb-3 text-slate-900">
            {t("requests-form.parallelProcessingOptions", "Parallel Processing Options")}
          </h3>

          {/* Parallel processing fields will be rendered by the main form field loop */}
        </div>
      );
    }

    return null;
  };

  // Group fields by category (for ADDITIONAL_SETTINGS tab, we might want sections)
  const groupedFields = useMemo(() => {
    if (tabName !== TabPlace.ADDITIONAL_SETTINGS || !advancedMode) {
      return { regular: formFields, parallel: [] };
    }

    // For ADDITIONAL_SETTINGS with advanced mode, separate parallel processing options
    return {
      regular: formFields.filter(field => !["omp", "nThreads", "mpi", "nProces"].includes(field.id)),
      parallel: formFields.filter(field => ["omp", "nThreads", "mpi", "nProces"].includes(field.id)),
    };
  }, [formFields, tabName, advancedMode]);

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-slate-900">{getTitle()}</h2>

      <div className={tabName === TabPlace.MAP_CONFIG ? "grid grid-cols-1 md:grid-cols-2 gap-6" : ""}>
        {groupedFields.regular.map(fieldConfig => (
          <DynamicFormField
            key={fieldConfig.id}
            config={fieldConfig}
            value={formData[fieldConfig.name]}
            error={errors[fieldConfig.name as string]}
            formData={formData}
            updateField={updateFormField}
            handleCheckboxChange={handleCheckboxChange}
          />
        ))}
      </div>

      {renderAdditionalSections()}

      {tabName === TabPlace.ADDITIONAL_SETTINGS && advancedMode && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {groupedFields.parallel.map(fieldConfig => (
            <DynamicFormField
              key={fieldConfig.id}
              config={fieldConfig}
              value={formData[fieldConfig.name]}
              error={errors[fieldConfig.name as string]}
              formData={formData}
              updateField={updateFormField}
              handleCheckboxChange={handleCheckboxChange}
            />
          ))}
        </div>
      )}

      {navigationButtons}
    </div>
  );
};

export default React.memo(PopulateFormTab);
