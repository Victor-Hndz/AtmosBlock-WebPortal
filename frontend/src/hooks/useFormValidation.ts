import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { TabPlace, InputType } from "@/types/FormField";
import { getFormFieldsForTab } from "@/consts/formFieldsConfig";
import { RequestForm } from "@/types/Request";

/**
 * Custom hook for form validation
 * @param advancedMode Whether advanced mode is enabled
 * @returns Validation utilities
 */
export const useFormValidation = (advancedMode: boolean) => {
  const { t } = useTranslation();
  const [errors, setErrors] = useState<Record<string, string>>({});

  /**
   * Validates form fields for a specific tab
   * @param tabName The tab to validate fields for
   * @param formData Current form data
   * @returns Whether validation passed
   */
  const validateTabFields = useCallback(
    (tabName: TabPlace, formData: RequestForm): boolean => {
      const fieldsToValidate = getFormFieldsForTab(tabName, advancedMode);
      const newErrors: Record<string, string> = {};
      let isValid = true;

      fieldsToValidate.forEach(field => {
        // Skip optional fields
        if (field.optionalField) return;

        // Check required fields
        if (field.validation?.required) {
          const value = formData[field.name];

          if (!value || (Array.isArray(value) && value.length === 0)) {
            newErrors[field.name as string] = t("requests-form.required");
            isValid = false;
          }
        }

        // Check pattern validation if specified
        if (field.validation?.pattern && typeof formData[field.name] === "string") {
          const value = formData[field.name] as string;
          if (value && !field.validation.pattern.test(value)) {
            newErrors[field.name as string] = t("requests-form.invalidFormat");
            isValid = false;
          }
        }

        // Check min/max for number inputs
        if (field.inputType === InputType.NUMBER) {
          const numValue = Number(formData[field.name]);

          if (!isNaN(numValue)) {
            // Check min value
            if (field.validation?.minValue !== undefined && numValue < field.validation.minValue) {
              newErrors[field.name as string] = t("requests-form.valueTooShort", {
                min: field.validation.minValue,
              });
              isValid = false;
            }

            // Check max value
            if (field.validation?.maxValue !== undefined && numValue > field.validation.maxValue) {
              newErrors[field.name as string] = t("requests-form.valueTooLong", {
                max: field.validation.maxValue,
              });
              isValid = false;
            }
          }
        }

        // Validate area input coordinates
        if (field.inputType === InputType.AREA_INPUT && typeof formData[field.name] === "string") {
          const coordinates = (formData[field.name] as string).split(",");

          // Check if we have all 4 coordinates
          if (coordinates.length !== 4) {
            newErrors[field.name as string] = t("requests-form.invalidCoordinates");
            isValid = false;
          } else {
            const [north, west, south, east] = coordinates.map(Number);

            // Validate each coordinate is in the proper range
            if (isNaN(north) || north < 0 || north > 90) {
              newErrors[field.name as string] = t("requests-form.invalidNorthCoordinate");
              isValid = false;
            } else if (isNaN(west) || west < -180 || west > 0) {
              newErrors[field.name as string] = t("requests-form.invalidWestCoordinate");
              isValid = false;
            } else if (isNaN(south) || south < -90 || south > 0) {
              newErrors[field.name as string] = t("requests-form.invalidSouthCoordinate");
              isValid = false;
            } else if (isNaN(east) || east < 0 || east > 180) {
              newErrors[field.name as string] = t("requests-form.invalidEastCoordinate");
              isValid = false;
            }
          }
        }

        // Check min length
        if (
          field.validation?.minLength &&
          typeof formData[field.name] === "string" &&
          (formData[field.name] as string).length < field.validation.minLength
        ) {
          newErrors[field.name as string] = t("requests-form.valueTooShort", {
            min: field.validation.minLength,
          });
          isValid = false;
        }

        // Check max length
        if (
          field.validation?.maxLength &&
          typeof formData[field.name] === "string" &&
          (formData[field.name] as string).length > field.validation.maxLength
        ) {
          newErrors[field.name as string] = t("requests-form.valueTooLong", {
            max: field.validation.maxLength,
          });
          isValid = false;
        }
      });

      setErrors(newErrors);
      return isValid;
    },
    [advancedMode, t]
  );

  /**
   * Validates the entire form
   * @param formData Current form data
   * @returns Whether validation passed
   */
  const validateFullForm = useCallback(
    (formData: RequestForm): boolean => {
      // Check all tabs
      const basicInfoValid = validateTabFields(TabPlace.BASIC_INFO, formData);
      const mapConfigValid = validateTabFields(TabPlace.MAP_CONFIG, formData);
      const additionalSettingsValid = validateTabFields(TabPlace.ADDITIONAL_SETTINGS, formData);

      return basicInfoValid && mapConfigValid && additionalSettingsValid;
    },
    [validateTabFields]
  );

  return {
    errors,
    setErrors,
    validateTabFields,
    validateFullForm,
  };
};
