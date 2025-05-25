import { useCallback, useState } from "react";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { updateFormField, submitRequest } from "@/redux/slices/submitRequestsSlice";
import { RequestForm } from "@/types/Request";
import { TFunction } from "i18next";

interface SubmitResult {
  success: boolean;
  message: string;
  requestHash?: string;  // Add requestHash to the return type
}

interface UseRequestFormReturn {
  formData: RequestForm;
  isSubmitting: boolean;
  updateField: <K extends keyof RequestForm>(field: K, value: RequestForm[K]) => void;
  handleSubmit: () => Promise<SubmitResult>;
  clearForm: () => SubmitResult;
  handleCheckboxChange: <K extends keyof RequestForm>(
    field: K,
    value: string,
    checked: boolean | "indeterminate"
  ) => void;
}

/**
 * Custom hook to manage request form state and operations
 * @param t - Translation function
 * @returns Object containing form data, submission state, and helper methods
 */
export const useRequestForm = (t: TFunction): UseRequestFormReturn => {
  const dispatch = useAppDispatch();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Select only necessary parts of the state to prevent unnecessary re-renders
  const formData = useAppSelector(state => state.submitRequests.form);

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
    setIsSubmitting(true);

    try {
      const result = await dispatch(submitRequest(formData)).unwrap();
      setIsSubmitting(false);

      return {
        success: true,
        message: t("requests-titles.success"),
        requestHash: result.requestHash,  // Include the requestHash from API response
      };
    } catch (error) {
      setIsSubmitting(false);

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

      const currentValues = Array.isArray(formData[field]) ? (formData[field] as string[]) : [];

      if (checked) {
        // Add value if it doesn't exist
        if (!currentValues.includes(value)) {
          updateField(field, [...currentValues, value] as RequestForm[K]);
        }
      } else {
        // Remove value if it exists
        if (currentValues.includes(value)) {
          updateField(field, currentValues.filter(v => v !== value) as RequestForm[K]);
        }
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
