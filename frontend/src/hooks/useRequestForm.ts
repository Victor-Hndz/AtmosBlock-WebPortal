import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { updateFormField, submitRequest } from "@/redux/slices/submitRequestsSlice";
import { RequestForm } from "@/types/Request";

/**
 * Custom hook to manage request form state and operations
 * @returns Object containing form data, submission state, and helper methods
 */
export const useRequestForm = () => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();

  // Select only necessary parts of the state to prevent unnecessary re-renders
  const formData = useAppSelector(state => state.submitRequests.form);
  const isSubmitting = useAppSelector(state => state.submitRequests.isSubmitting);

  /**
   * Updates a specific form field value
   * @param field - The field name to update
   * @param value - The new value for the field
   */
  const updateField = useCallback(
    <K extends keyof RequestForm>(field: K, value: RequestForm[K]) => {
      dispatch(updateFormField({ field, value: value ?? "" }));
    },
    [dispatch]
  );

  /**
   * Submits the form data to the API
   * @returns Promise with the result of the submission
   */
  const handleSubmit = useCallback(async () => {
    try {
      const result = await dispatch(submitRequest(formData)).unwrap();
      return {
        success: true,
        data: result,
        message: t("requests-titles.success"),
      };
    } catch (error) {
      return {
        success: false,
        error,
        message: `${t("errors.title")}: ${error instanceof Error ? error.message : t("errors.submission")}`,
      };
    }
  }, [dispatch, formData, t]);

  /**
   * Clears all form fields
   * @returns Object indicating success and a message
   */
  const clearForm = useCallback(() => {
    // Get all form fields
    const keys = Object.keys(formData);

    // Process each field based on its type
    keys.forEach(key => {
      const field = key as keyof RequestForm;
      let value;

      if (Array.isArray(formData[field])) {
        value = [];
      } else if (typeof formData[field] === "boolean") {
        value = false;
      } else {
        value = "";
      }

      dispatch(updateFormField({ field, value }));
    });

    return {
      success: true,
      message: t("requests-titles.clearSuccess"),
    };
  }, [dispatch, formData, t]);

  /**
   * Handles checkbox change for array type form fields
   * @param field - The form field to update
   * @param value - The value to add or remove
   * @param checked - Whether the checkbox is checked
   */
  const handleCheckboxChange = useCallback(
    <K extends keyof RequestForm>(field: K, value: string, checked: boolean | "indeterminate") => {
      if (typeof checked !== "boolean") return;

      const currentValues = (formData[field] as string[]) || [];

      if (checked) {
        updateField(field, [...currentValues, value] as RequestForm[K]);
      } else {
        updateField(field, currentValues.filter(v => v !== value) as RequestForm[K]);
      }
    },
    [formData, updateField]
  );

  return {
    formData,
    isSubmitting,
    updateField,
    handleSubmit,
    clearForm,
    handleCheckboxChange,
  };
};
