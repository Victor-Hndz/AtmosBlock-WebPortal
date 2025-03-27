import React, { useState } from "react";
import FormField from "./FormField";
import { RequestForm } from "@/redux/slices/requestsSlice";

interface BasicInfoFormProps {
  formData: RequestForm;
  updateFormField: <K extends keyof RequestForm>(field: K, value: RequestForm[K]) => void;
  onNext: () => void;
}

/**
 * Available years for selection
 */
const availableYears = ["2020", "2021", "2022", "2023", "2024"];

/**
 * Available months for selection
 */
const availableMonths = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/**
 * Available days for selection
 */
const availableDays = Array.from({ length: 31 }, (_, i) => `${i + 1}`);

/**
 * Available hours for selection
 */
const availableHours = Array.from({ length: 24 }, (_, i) => `${i}:00`);

/**
 * Basic information form component for the first step of the request form
 */
const BasicInfoForm: React.FC<BasicInfoFormProps> = ({ formData, updateFormField, onNext }) => {
  const [errors, setErrors] = useState<Record<string, string>>({});

  /**
   * Validates the form fields before proceeding to the next step
   * @returns {boolean} True if validation passes, false otherwise
   */
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.variableName) {
      newErrors.variableName = "Variable name is required";
    }

    if (!formData.years?.length) {
      newErrors.years = "At least one year must be selected";
    }

    if (!formData.months?.length) {
      newErrors.months = "At least one month must be selected";
    }

    if (!formData.days?.length) {
      newErrors.days = "At least one day must be selected";
    }

    if (!formData.hours?.length) {
      newErrors.hours = "At least one hour must be selected";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * Handles clicking the next button
   */
  const handleNextClick = () => {
    if (validateForm()) {
      onNext();
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Basic Information</h2>

      <FormField
        id="variableName"
        label="Variable Name"
        tooltip="Enter the name of the variable you want to process"
        error={errors.variableName}
        required
      >
        <input
          id="variableName"
          type="text"
          value={formData.variableName ?? ""}
          onChange={e => updateFormField("variableName", e.target.value)}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
        />
      </FormField>

      <FormField
        id="years"
        label="Select Years"
        tooltip="Select one or more years for the data"
        error={errors.years}
        required
      >
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
          {availableYears.map(year => (
            <label key={year} className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={formData.years?.includes(year) || false}
                onChange={e => {
                  const currentYears = formData.years || [];
                  if (e.target.checked) {
                    updateFormField("years", [...currentYears, year]);
                  } else {
                    updateFormField(
                      "years",
                      currentYears.filter(y => y !== year)
                    );
                  }
                }}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span>{year}</span>
            </label>
          ))}
        </div>
      </FormField>

      <FormField
        id="months"
        label="Select Months"
        tooltip="Select one or more months for the data"
        error={errors.months}
        required
      >
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {availableMonths.map(month => (
            <label key={month} className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={formData.months?.includes(month) || false}
                onChange={e => {
                  const currentMonths = formData.months || [];
                  if (e.target.checked) {
                    updateFormField("months", [...currentMonths, month]);
                  } else {
                    updateFormField(
                      "months",
                      currentMonths.filter(m => m !== month)
                    );
                  }
                }}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span>{month}</span>
            </label>
          ))}
        </div>
      </FormField>

      <FormField
        id="days"
        label="Select Days"
        tooltip="Select one or more days for the data"
        error={errors.days}
        required
      >
        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2 max-h-48 overflow-y-auto border border-gray-200 rounded-md p-2">
          {availableDays.map(day => (
            <label key={day} className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={formData.days?.includes(day) || false}
                onChange={e => {
                  const currentDays = formData.days || [];
                  if (e.target.checked) {
                    updateFormField("days", [...currentDays, day]);
                  } else {
                    updateFormField(
                      "days",
                      currentDays.filter(d => d !== day)
                    );
                  }
                }}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span>{day}</span>
            </label>
          ))}
        </div>
      </FormField>

      <FormField
        id="hours"
        label="Select Hours"
        tooltip="Select one or more hours for the data"
        error={errors.hours}
        required
      >
        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
          {availableHours.map(hour => (
            <label key={hour} className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={formData.hours?.includes(hour) || false}
                onChange={e => {
                  const currentHours = formData.hours || [];
                  if (e.target.checked) {
                    updateFormField("hours", [...currentHours, hour]);
                  } else {
                    updateFormField(
                      "hours",
                      currentHours.filter(h => h !== hour)
                    );
                  }
                }}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span>{hour}</span>
            </label>
          ))}
        </div>
      </FormField>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleNextClick}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          Next
        </button>
      </div>
    </div>
  );
};

export default BasicInfoForm;
