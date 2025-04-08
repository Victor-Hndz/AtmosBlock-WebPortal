import React, { useState } from "react";
import * as Checkbox from "@radix-ui/react-checkbox";
import { Check } from "lucide-react";
import { useTranslation } from "react-i18next";
import FormField from "./FormField";
import { RequestForm } from "@/types/Request";

interface MapConfigFormProps {
  formData: RequestForm;
  updateFormField: <K extends keyof RequestForm>(field: K, value: RequestForm[K]) => void;
  onNext: () => void;
  onPrevious: () => void;
}

/**
 * Available pressure levels for selection
 */
const pressureLevelOptions = ["1000hPa", "850hPa", "700hPa", "500hPa", "300hPa", "200hPa", "100hPa"];

/**
 * Available area coverage options
 */
const areaCoverageOptions = [
  "Global",
  "Northern Hemisphere",
  "Southern Hemisphere",
  "Europe",
  "North America",
  "Asia",
  "Africa",
  "Oceania",
];

/**
 * Available map types
 */
const mapTypeOptions = ["Contour", "Filled Contour", "Vector", "Streamline", "Wind Barbs"];

/**
 * Available map ranges
 */
const mapRangeOptions = ["Default", "Custom", "Auto"];

/**
 * Available map levels
 */
const mapLevelOptions = ["Surface", "Upper Air", "Both"];

/**
 * Map configuration form component for the second step of the request form
 */
const MapConfigForm: React.FC<MapConfigFormProps> = ({
  formData = {} as RequestForm,
  updateFormField,
  onNext,
  onPrevious,
}) => {
  const { t } = useTranslation();
  const [errors, setErrors] = useState<Record<string, string>>({});

  /**
   * Validates the form fields before proceeding to the next step
   * @returns {boolean} True if validation passes, false otherwise
   */
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData?.pressureLevels?.length) {
      newErrors.pressureLevels = t("requests-form.required");
    }

    if (!formData?.areaCovered?.length) {
      newErrors.areaCovered = t("requests-form.required");
    }

    if (!formData?.mapTypes?.length) {
      newErrors.mapTypes = t("requests-form.required");
    }

    if (!formData?.mapRanges?.length) {
      newErrors.mapRanges = t("requests-form.required");
    }

    if (!formData?.mapLevels?.length) {
      newErrors.mapLevels = t("requests-form.required");
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

  /**
   * Handles checkbox change for array type form fields
   * @param field - The form field to update
   * @param value - The value to add or remove
   * @param checked - Whether the checkbox is checked
   */
  const handleCheckboxChange = <K extends keyof RequestForm>(
    field: K,
    value: string,
    checked: boolean | "indeterminate"
  ) => {
    if (typeof checked !== "boolean" || !formData) return;

    const currentValues = (formData[field] as string[]) || [];
    if (checked) {
      updateFormField(field, [...currentValues, value] as RequestForm[K]);
    } else {
      updateFormField(field, currentValues.filter(v => v !== value) as RequestForm[K]);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-slate-900">{t("requests-titles.mapConfig")}</h2>

      <div>
        {" "}
        {/* Changed from Form.Root to plain div */}
        <FormField
          id="pressureLevels"
          label={t("requests-form.pressureLevels")}
          tooltip={t(
            "requests-form.pressureLevelsTooltip",
            "Select one or more pressure levels for your data visualization"
          )}
          error={errors.pressureLevels}
          required
        >
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 mt-1.5">
            {pressureLevelOptions.map(level => (
              <label key={level} className="flex items-center space-x-2 text-sm text-slate-700 cursor-pointer">
                <Checkbox.Root
                  id={`level-${level}`}
                  checked={formData?.pressureLevels?.includes(level) || false}
                  onCheckedChange={checked => handleCheckboxChange("pressureLevels", level, checked)}
                  className="h-4 w-4 rounded border border-slate-300 bg-white
                            data-[state=checked]:bg-violet-600 data-[state=checked]:border-violet-600 
                            focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-1"
                >
                  <Checkbox.Indicator className="flex items-center justify-center text-white">
                    <Check className="h-3 w-3" />
                  </Checkbox.Indicator>
                </Checkbox.Root>
                <span>{level}</span>
              </label>
            ))}
          </div>
        </FormField>
        <FormField
          id="areaCovered"
          label={t("requests-form.areaCovered")}
          tooltip={t("requests-form.areaCoveredTooltip", "Select the geographical areas to be covered")}
          error={errors.areaCovered}
          required
        >
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 mt-1.5">
            {areaCoverageOptions.map(area => (
              <label key={area} className="flex items-center space-x-2 text-sm text-slate-700 cursor-pointer">
                <Checkbox.Root
                  id={`area-${area}`}
                  checked={formData?.areaCovered?.includes(area) || false}
                  onCheckedChange={checked => handleCheckboxChange("areaCovered", area, checked)}
                  className="h-4 w-4 rounded border border-slate-300 bg-white
                            data-[state=checked]:bg-violet-600 data-[state=checked]:border-violet-600 
                            focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-1"
                >
                  <Checkbox.Indicator className="flex items-center justify-center text-white">
                    <Check className="h-3 w-3" />
                  </Checkbox.Indicator>
                </Checkbox.Root>
                <span>{area}</span>
              </label>
            ))}
          </div>
        </FormField>
        <FormField
          id="mapTypes"
          label={t("requests-form.mapTypes")}
          tooltip={t("requests-form.mapTypesTooltip", "Select the types of maps to generate")}
          error={errors.mapTypes}
          required
        >
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-1.5">
            {mapTypeOptions.map(type => (
              <label key={type} className="flex items-center space-x-2 text-sm text-slate-700 cursor-pointer">
                <Checkbox.Root
                  id={`type-${type}`}
                  checked={formData?.mapTypes?.includes(type) || false}
                  onCheckedChange={checked => handleCheckboxChange("mapTypes", type, checked)}
                  className="h-4 w-4 rounded border border-slate-300 bg-white
                            data-[state=checked]:bg-violet-600 data-[state=checked]:border-violet-600 
                            focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-1"
                >
                  <Checkbox.Indicator className="flex items-center justify-center text-white">
                    <Check className="h-3 w-3" />
                  </Checkbox.Indicator>
                </Checkbox.Root>
                <span>{type}</span>
              </label>
            ))}
          </div>
        </FormField>
        <FormField
          id="mapRanges"
          label={t("requests-form.mapRanges")}
          tooltip={t("requests-form.mapRangesTooltip", "Select the range options for your maps")}
          error={errors.mapRanges}
          required
        >
          <div className="grid grid-cols-3 gap-2 mt-1.5">
            {mapRangeOptions.map(range => (
              <label key={range} className="flex items-center space-x-2 text-sm text-slate-700 cursor-pointer">
                <Checkbox.Root
                  id={`range-${range}`}
                  checked={formData?.mapRanges?.includes(range) || false}
                  onCheckedChange={checked => handleCheckboxChange("mapRanges", range, checked)}
                  className="h-4 w-4 rounded border border-slate-300 bg-white
                            data-[state=checked]:bg-violet-600 data-[state=checked]:border-violet-600 
                            focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-1"
                >
                  <Checkbox.Indicator className="flex items-center justify-center text-white">
                    <Check className="h-3 w-3" />
                  </Checkbox.Indicator>
                </Checkbox.Root>
                <span>{range}</span>
              </label>
            ))}
          </div>
        </FormField>
        <FormField
          id="mapLevels"
          label={t("requests-form.mapLevels")}
          tooltip={t("requests-form.mapLevelsTooltip", "Select the vertical levels for your maps")}
          error={errors.mapLevels}
          required
        >
          <div className="grid grid-cols-3 gap-2 mt-1.5">
            {mapLevelOptions.map(level => (
              <label key={level} className="flex items-center space-x-2 text-sm text-slate-700 cursor-pointer">
                <Checkbox.Root
                  id={`level-${level}`}
                  checked={formData?.mapLevels?.includes(level) || false}
                  onCheckedChange={checked => handleCheckboxChange("mapLevels", level, checked)}
                  className="h-4 w-4 rounded border border-slate-300 bg-white
                            data-[state=checked]:bg-violet-600 data-[state=checked]:border-violet-600 
                            focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-1"
                >
                  <Checkbox.Indicator className="flex items-center justify-center text-white">
                    <Check className="h-3 w-3" />
                  </Checkbox.Indicator>
                </Checkbox.Root>
                <span>{level}</span>
              </label>
            ))}
          </div>
        </FormField>
      </div>

      <div className="flex justify-between">
        <button
          type="button"
          onClick={onPrevious}
          className="px-4 py-2 border border-slate-300 rounded-md shadow-sm text-sm font-medium text-slate-700 
                    bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2
                    transition-colors duration-200"
        >
          {t("buttons.back")}
        </button>
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
  );
};

export default MapConfigForm;
