import React, { useState, useMemo, useCallback } from "react";
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
const pressureLevels = ["1000hPa", "850hPa", "700hPa", "500hPa", "300hPa", "200hPa", "100hPa"];

/**
 * Available areas for selection
 */
const areas = [
  "Global",
  "Northern Hemisphere",
  "Southern Hemisphere",
  "Europe",
  "North America",
  "South America",
  "Asia",
  "Africa",
  "Australia",
];

/**
 * Available map types for selection
 */
const mapTypes = ["Contour", "Filled Contour", "Vector", "StreamLine"];

/**
 * Available map ranges for selection
 */
const mapRanges = ["Auto", "Fixed", "Custom"];

/**
 * Available map levels for selection
 */
const mapLevels = ["Surface", "Isobaric", "Isentropic"];

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
  const validateForm = useCallback((): boolean => {
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
  }, [
    formData?.pressureLevels,
    formData?.areaCovered,
    formData?.mapTypes,
    formData?.mapRanges,
    formData?.mapLevels,
    t,
  ]);

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

  // Memoize the pressure levels section to prevent re-renders
  const pressureLevelsSection = useMemo(
    () => (
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
          {pressureLevels.map(level => (
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
    ),
    [formData?.pressureLevels, errors.pressureLevels, t, handleCheckboxChange]
  );

  // Memoize the areas section to prevent re-renders
  const areasSection = useMemo(
    () => (
      <FormField
        id="areaCovered"
        label={t("requests-form.areaCovered")}
        tooltip={t("requests-form.areaCoveredTooltip", "Select the geographical areas to be covered")}
        error={errors.areaCovered}
        required
      >
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-1.5">
          {areas.map(area => (
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
    ),
    [formData?.areaCovered, errors.areaCovered, t, handleCheckboxChange]
  );

  // Memoize the map types section to prevent re-renders
  const mapTypesSection = useMemo(
    () => (
      <FormField
        id="mapTypes"
        label={t("requests-form.mapTypes")}
        tooltip={t("requests-form.mapTypesTooltip", "Select the types of maps to generate")}
        error={errors.mapTypes}
        required
      >
        <div className="grid grid-cols-2 gap-2 mt-1.5">
          {mapTypes.map(type => (
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
    ),
    [formData?.mapTypes, errors.mapTypes, t, handleCheckboxChange]
  );

  // Memoize the map ranges section to prevent re-renders
  const mapRangesSection = useMemo(
    () => (
      <FormField
        id="mapRanges"
        label={t("requests-form.mapRanges")}
        tooltip={t("requests-form.mapRangesTooltip", "Select the range options for your maps")}
        error={errors.mapRanges}
        required
      >
        <div className="grid grid-cols-3 gap-2 mt-1.5">
          {mapRanges.map(range => (
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
    ),
    [formData?.mapRanges, errors.mapRanges, t, handleCheckboxChange]
  );

  // Memoize the map levels section to prevent re-renders
  const mapLevelsSection = useMemo(
    () => (
      <FormField
        id="mapLevels"
        label={t("requests-form.mapLevels")}
        tooltip={t("requests-form.mapLevelsTooltip", "Select the vertical levels for your maps")}
        error={errors.mapLevels}
        required
      >
        <div className="grid grid-cols-3 gap-2 mt-1.5">
          {mapLevels.map(level => (
            <label key={level} className="flex items-center space-x-2 text-sm text-slate-700 cursor-pointer">
              <Checkbox.Root
                id={`map-level-${level}`}
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
    ),
    [formData?.mapLevels, errors.mapLevels, t, handleCheckboxChange]
  );

  // Memoize the navigation buttons to prevent re-renders
  const navigationButtons = useMemo(
    () => (
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
    ),
    [onPrevious, handleNextClick, t]
  );

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-slate-900">{t("requests-titles.mapConfig")}</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {pressureLevelsSection}
        {areasSection}
        {mapTypesSection}
        {mapRangesSection}
        {mapLevelsSection}
      </div>

      {navigationButtons}
    </div>
  );
};

export default React.memo(MapConfigForm);
