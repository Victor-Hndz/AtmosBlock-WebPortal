import React, { useState, useMemo, useCallback } from "react";
import * as Checkbox from "@radix-ui/react-checkbox";
import { Check } from "lucide-react";
import { useTranslation } from "react-i18next";
import FormField from "./FormField";
import { RequestForm } from "@/types/Request";
import { AVAILABLE_YEARS, AVAILABLE_MONTHS, calculateAvailableDays, AVAILABLE_HOURS } from "@/consts/requestsConsts";

interface BasicInfoFormProps {
  formData: RequestForm;
  updateFormField: <K extends keyof RequestForm>(field: K, value: RequestForm[K]) => void;
  onNext: () => void;
}

/**
 * Basic information form component for the first step of the request form
 */
const BasicInfoForm: React.FC<BasicInfoFormProps> = ({ formData = {} as RequestForm, updateFormField, onNext }) => {
  const { t } = useTranslation();
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Calculate available days based on selected years and months
  const availableDays = useMemo(() => {
    return calculateAvailableDays(formData?.years || [], formData?.months || []);
  }, [formData?.years, formData?.months]);

  /**
   * Validates the form fields before proceeding to the next step
   * @returns {boolean} True if validation passes, false otherwise
   */
  const validateForm = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData?.variableName) {
      newErrors.variableName = t("requests-form.required");
    }

    if (!formData?.years?.length) {
      newErrors.years = t("requests-form.required");
    }

    if (!formData?.months?.length) {
      newErrors.months = t("requests-form.required");
    }

    if (!formData?.days?.length) {
      newErrors.days = t("requests-form.required");
    }

    if (!formData?.hours?.length) {
      newErrors.hours = t("requests-form.required");
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData?.variableName, formData?.years, formData?.months, formData?.days, formData?.hours, t]);

  /**
   * Handles clicking the next button
   */
  const handleNextClick = useCallback(() => {
    if (validateForm()) {
      onNext();
    }
  }, [validateForm, onNext]);

  /**
   * Handles checkbox change for array type form fields
   * @param field - The form field to update
   * @param value - The value to add or remove
   * @param checked - Whether the checkbox is checked
   */
  const handleCheckboxChange = useCallback(
    <K extends keyof RequestForm>(field: K, value: string, checked: boolean | "indeterminate") => {
      if (typeof checked !== "boolean" || !formData) return;

      const currentValues = (formData[field] as string[]) || [];

      if (checked) {
        updateFormField(field, [...currentValues, value] as RequestForm[K]);
      } else {
        updateFormField(field, currentValues.filter(v => v !== value) as RequestForm[K]);
      }
    },
    [formData, updateFormField]
  );

  // Memoize the variable name input to prevent re-renders
  const variableNameInput = useMemo(
    () => (
      <FormField
        id="variableName"
        label={t("requests-form.variableName")}
        tooltip={t("requests-form.variableNameTooltip", "Enter the name of the variable you want to process")}
        error={errors.variableName}
        required
      >
        <input
          id="variableName"
          type="text"
          value={formData?.variableName ?? ""}
          onChange={e => updateFormField("variableName", e.target.value)}
          className="mt-1.5 w-full rounded-md border border-slate-300 px-3 py-2 text-sm placeholder:text-slate-400 
                    focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
        />
      </FormField>
    ),
    [formData?.variableName, errors.variableName, t, updateFormField]
  );

  // Memoize the years checkboxes to prevent re-renders
  const yearsSection = useMemo(
    () => (
      <FormField
        id="years"
        label={t("requests-form.years")}
        tooltip={t("requests-form.yearsTooltip", "Select one or more years for the data")}
        error={errors.years}
        required
      >
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 mt-1.5">
          {AVAILABLE_YEARS.map(year => (
            <label key={year} className="flex items-center space-x-2 text-sm text-slate-700 cursor-pointer">
              <Checkbox.Root
                id={`year-${year}`}
                checked={formData?.years?.includes(year) || false}
                onCheckedChange={checked => handleCheckboxChange("years", year, checked)}
                className="h-4 w-4 rounded border border-slate-300 bg-white
                        data-[state=checked]:bg-violet-600 data-[state=checked]:border-violet-600 
                        focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-1"
              >
                <Checkbox.Indicator className="flex items-center justify-center text-white">
                  <Check className="h-3 w-3" />
                </Checkbox.Indicator>
              </Checkbox.Root>
              <span>{year}</span>
            </label>
          ))}
        </div>
      </FormField>
    ),
    [formData?.years, errors.years, t, handleCheckboxChange]
  );

  // Memoize the months checkboxes to prevent re-renders
  const monthsSection = useMemo(
    () => (
      <FormField
        id="months"
        label={t("requests-form.months")}
        tooltip={t("requests-form.monthsTooltip", "Select one or more months for the data")}
        error={errors.months}
        required
      >
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 mt-1.5">
          {AVAILABLE_MONTHS.map(month => (
            <label key={month} className="flex items-center space-x-2 text-sm text-slate-700 cursor-pointer">
              <Checkbox.Root
                id={`month-${month}`}
                checked={formData?.months?.includes(month) || false}
                onCheckedChange={checked => handleCheckboxChange("months", month, checked)}
                className="h-4 w-4 rounded border border-slate-300 bg-white
                        data-[state=checked]:bg-violet-600 data-[state=checked]:border-violet-600 
                        focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-1"
              >
                <Checkbox.Indicator className="flex items-center justify-center text-white">
                  <Check className="h-3 w-3" />
                </Checkbox.Indicator>
              </Checkbox.Root>
              <span>{month}</span>
            </label>
          ))}
        </div>
      </FormField>
    ),
    [formData?.months, errors.months, t, handleCheckboxChange]
  );

  // Memoize the days checkboxes to prevent re-renders
  const daysSection = useMemo(
    () => (
      <FormField
        id="days"
        label={t("requests-form.days")}
        tooltip={t("requests-form.daysTooltip", "Select one or more days for the data")}
        error={errors.days}
        required
      >
        <div
          className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2 max-h-48 overflow-y-auto 
                  border border-slate-200 rounded-md p-2 mt-1.5"
        >
          {availableDays.map(day => (
            <label key={day} className="flex items-center space-x-2 text-sm text-slate-700 cursor-pointer">
              <Checkbox.Root
                id={`day-${day}`}
                checked={formData?.days?.includes(day) || false}
                onCheckedChange={checked => handleCheckboxChange("days", day, checked)}
                className="h-4 w-4 rounded border border-slate-300 bg-white
                        data-[state=checked]:bg-violet-600 data-[state=checked]:border-violet-600 
                        focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-1"
              >
                <Checkbox.Indicator className="flex items-center justify-center text-white">
                  <Check className="h-3 w-3" />
                </Checkbox.Indicator>
              </Checkbox.Root>
              <span>{day}</span>
            </label>
          ))}
        </div>
      </FormField>
    ),
    [formData?.days, errors.days, t, handleCheckboxChange, availableDays]
  );

  // Memoize the hours checkboxes to prevent re-renders
  const hoursSection = useMemo(
    () => (
      <FormField
        id="hours"
        label={t("requests-form.hours")}
        tooltip={t("requests-form.hoursTooltip", "Select one or more hours for the data")}
        error={errors.hours}
        required
      >
        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2 mt-1.5">
          {AVAILABLE_HOURS.map(hour => (
            <label key={hour} className="flex items-center space-x-2 text-sm text-slate-700 cursor-pointer">
              <Checkbox.Root
                id={`hour-${hour}`}
                checked={formData?.hours?.includes(hour) || false}
                onCheckedChange={checked => handleCheckboxChange("hours", hour, checked)}
                className="h-4 w-4 rounded border border-slate-300 bg-white
                        data-[state=checked]:bg-violet-600 data-[state=checked]:border-violet-600 
                        focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-1"
              >
                <Checkbox.Indicator className="flex items-center justify-center text-white">
                  <Check className="h-3 w-3" />
                </Checkbox.Indicator>
              </Checkbox.Root>
              <span>{hour}</span>
            </label>
          ))}
        </div>
      </FormField>
    ),
    [formData?.hours, errors.hours, t, handleCheckboxChange]
  );

  // Memoize the next button to prevent re-renders
  const nextButton = useMemo(
    () => (
      <div className="flex justify-end">
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
    ),
    [handleNextClick, t]
  );

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-slate-900">{t("requests-titles.basicInfo")}</h2>

      <div>
        {variableNameInput}
        {yearsSection}
        {monthsSection}
        {daysSection}
        {hoursSection}
      </div>

      {nextButton}
    </div>
  );
};

export default React.memo(BasicInfoForm);
