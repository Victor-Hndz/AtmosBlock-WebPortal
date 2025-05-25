import React, { useState, useEffect, useMemo } from "react";
import * as Checkbox from "@radix-ui/react-checkbox";
import * as Select from "@radix-ui/react-select";
import * as Switch from "@radix-ui/react-switch";
import * as Popover from "@radix-ui/react-popover";
import {
  Check,
  ChevronDown,
  ChevronUp,
  Calendar,
  Clock,
  CalendarDays,
  X,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
} from "lucide-react";
import { useTranslation } from "react-i18next";

import { FormFieldConfig, InputType } from "@/types/FormField";
import { RequestForm } from "@/types/Request";
import { shouldShowField } from "@/consts/formFieldsConfig";
import { calculateAvailableDays } from "@/consts/requestsConsts";
import FieldWrapper from "./FieldWrapper";
import { capitalize } from "@/utils/utilities";

interface DynamicFormFieldProps {
  config: FormFieldConfig;
  value: any;
  error?: string;
  formData: RequestForm;
  updateField: <K extends keyof RequestForm>(field: K, value: RequestForm[K]) => void;
  handleCheckboxChange?: <K extends keyof RequestForm>(
    field: K,
    value: string,
    checked: boolean | "indeterminate"
  ) => void;
}

/**
 * Dynamic form field component that renders different input types based on configuration
 */
const DynamicFormField: React.FC<DynamicFormFieldProps> = ({
  config,
  value,
  error,
  formData,
  updateField,
  handleCheckboxChange,
}) => {
  const { t } = useTranslation();
  const [isMultiselectOpen, setIsMultiselectOpen] = useState(false);
  const [activeDatePopover, setActiveDatePopover] = useState<"years" | "months" | "days" | "hours" | null>(null);
  const [useDefaultArea, setUseDefaultArea] = useState(true);

  // Area Input state
  const [areaCoords, setAreaCoords] = useState({
    up: "90",
    left: "-180",
    down: "-90",
    right: "180",
  });

  // Calculate available days based on selected years and months
  const availableDays = useMemo(() => {
    // Only calculate for days field
    if (config.name !== "days") return config.options || [];

    const selectedYears = formData.years || [];
    const selectedMonths = formData.months || [];

    // Calculate days based on selected years and months
    const days = calculateAvailableDays(selectedYears, selectedMonths);

    // Return as options array
    return days.map(day => ({ value: day, label: day }));
  }, [config.name, formData.years, formData.months, config.options]);

  // Initialize area coordinates and pressure levels from value if available
  useEffect(() => {
    if (config.inputType === InputType.AREA_INPUT) {
      if (value && Array.isArray(value) && value.length === 4) {
        setAreaCoords({
          up: value[0],
          left: value[1],
          down: value[2],
          right: value[3],
        });
      }
    }
    // Handle pressure levels as array
    if (config.name === "pressureLevels" && value) {
      // If it's a string, convert to array format
      if (typeof value === "string") {
        const pressureArray = value.split(",").map(v => v.trim());
        updateField("pressureLevels", pressureArray as any);
      }
      // If it's empty, initialize with empty array
      else if (!Array.isArray(value)) {
        updateField("pressureLevels", [] as any);
      }
    }
  }, [config.inputType, config.name, value, config.defaultValue, updateField]);

  // Handle clearing selected days when years or months change
  useEffect(() => {
    if (config.name === "days" && Array.isArray(value) && value.length > 0) {
      const selectedYears = formData.years || [];
      const selectedMonths = formData.months || [];

      // If no years or months selected, clear days selection
      if (selectedYears.length === 0 || selectedMonths.length === 0) {
        updateField("days", []);
        return;
      }

      // Get valid days for the current selection
      const validDays = calculateAvailableDays(selectedYears, selectedMonths);

      // Filter out invalid days from current selection
      const validSelection = value.filter(day => validDays.includes(day));

      // Update if the selection has changed
      if (validSelection.length !== value.length) {
        updateField("days", validSelection);
      }
    }
  }, [formData.years, formData.months, config.name, value, updateField]);

  // Check if the field should be shown based on its dependencies
  const shouldShow = shouldShowField(config, formData);

  if (!shouldShow) {
    return null;
  }

  // Handle area input changes
  const handleAreaCoordsChange = (key: keyof typeof areaCoords, val: string) => {
    const newCoords = { ...areaCoords, [key]: val };
    setAreaCoords(newCoords);
    updateField(config.name, [newCoords.up, newCoords.left, newCoords.down, newCoords.right] as any);
  };

  const toggleDefaultArea = (checked: boolean) => {
    setUseDefaultArea(checked);
    if (checked) {
      // Convert default value to array format if it's a string
      let defaultValue = config.defaultValue;
      if (typeof defaultValue === "string") {
        defaultValue = defaultValue.split(",").map(v => v.trim());
      }
      // Default to standard coordinates if no default provided
      const fallbackDefault = ["90", "-180", "-90", "180"];
      updateField(config.name, (defaultValue || fallbackDefault) as any);
    } else {
      updateField(config.name, [areaCoords.up, areaCoords.left, areaCoords.down, areaCoords.right] as any);
    }
  };

  // Render different input types based on the configuration
  const renderField = () => {
    switch (config.inputType) {
      case InputType.TEXT:
        return (
          <input
            id={config.id}
            type="text"
            value={value || ""}
            onChange={e => updateField(config.name, e.target.value as any)}
            placeholder={config.placeholder ? t(config.placeholder as any) : undefined}
            className="mt-1.5 w-full rounded-md border border-slate-300 px-3 py-2 text-sm placeholder:text-slate-400 
                      focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
          />
        );

      case InputType.NUMBER:
        return (
          <input
            id={config.id}
            type="number"
            value={value || ""}
            onChange={e => {
              const numberValue = e.target.value === "" ? "" : Number(e.target.value);
              updateField(config.name, numberValue as any);
            }}
            min={config.validation?.minValue}
            max={config.validation?.maxValue}
            placeholder={config.placeholder ? t(config.placeholder as any) : undefined}
            className="mt-1.5 w-full rounded-md border border-slate-300 px-3 py-2 text-sm placeholder:text-slate-400 
                      focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
          />
        );

      case InputType.SELECT:
        // Handle array values for pressure levels field
        let selectValue = value;

        // If value is an array, extract the first value for the select component
        if (Array.isArray(value) && config.name === "pressureLevels" || config.name === "mapLevels") {
          selectValue = value.length > 0 ? value[0] : "";
        }

        // Handle value changes for array-type fields
        const handleSelectChange = (newValue: string) => {
          if (config.name === "pressureLevels" || config.name === "mapLevels") {
            // Maintain array format for pressure levels
            updateField(config.name, [newValue] as any);
          } else {
            // Normal handling for other fields
            updateField(config.name, newValue as any);
          }
        };

        return (
          <Select.Root value={selectValue ?? ""} onValueChange={handleSelectChange}>
            <Select.Trigger
              className="inline-flex items-center justify-between w-full px-3 py-2 text-sm border border-slate-300 
                      rounded-md shadow-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-500 
                      focus:border-violet-500"
              aria-label={config.label ? t(config.label as any) : config.name}
            >
              <Select.Value
                placeholder={
                  config.placeholder
                    ? t(config.placeholder as any)
                    : t("requests-form.selectPlaceholder", "Select an option")
                }
              />
              <Select.Icon>
                <ChevronDown className="w-4 h-4 text-slate-500" />
              </Select.Icon>
            </Select.Trigger>
            <Select.Portal>
              <Select.Content className="overflow-hidden bg-white rounded-md shadow-lg border border-slate-200 z-50">
                <Select.ScrollUpButton className="flex items-center justify-center h-6 bg-white text-slate-700 cursor-default">
                  <ChevronUp className="w-4 h-4" />
                </Select.ScrollUpButton>
                <Select.Viewport className="p-1">
                  {config.options?.map(option => (
                    <Select.Item
                      key={option.value}
                      value={option.value}
                      className="relative flex items-center h-8 px-6 text-sm rounded-md select-none 
                            hover:bg-violet-100 data-[highlighted]:outline-none data-[highlighted]:bg-violet-100"
                    >
                      <Select.ItemText>{option.label}</Select.ItemText>
                      <Select.ItemIndicator className="absolute left-1 inline-flex items-center">
                        <Check className="w-4 h-4 text-violet-600" />
                      </Select.ItemIndicator>
                    </Select.Item>
                  ))}
                </Select.Viewport>
                <Select.ScrollDownButton className="flex items-center justify-center h-6 bg-white text-slate-700 cursor-default">
                  <ChevronDown className="w-4 h-4" />
                </Select.ScrollDownButton>
              </Select.Content>
            </Select.Portal>
          </Select.Root>
        );

      case InputType.MULTISELECT:
        const selectedOptions = Array.isArray(value) ? value : [];

        const handleMultiselectToggle = (optionValue: string) => {
          const isSelected = selectedOptions.includes(optionValue);
          const newSelection = isSelected
            ? selectedOptions.filter(v => v !== optionValue)
            : [...selectedOptions, optionValue];

          updateField(config.name, newSelection as any);
        };

        return (
          <div className="mt-1.5 space-y-3">
            <Popover.Root open={isMultiselectOpen} onOpenChange={setIsMultiselectOpen}>
              <Popover.Trigger asChild>
                <button
                  type="button"
                  className="inline-flex items-center justify-between w-full px-3 py-2 text-sm border border-slate-300 
                          rounded-md shadow-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-500 
                          focus:border-violet-500 disabled:bg-slate-100 disabled:text-slate-400 disabled:border-slate-200"
                >
                  <span className="inline-flex items-center">
                    <span className="truncate">
                      {selectedOptions.length === 0
                        ? t(
                            config.placeholder ? config.placeholder : `requests-form.select${config.name}`,
                            config.placeholder ? t(config.placeholder as any) : `Select ${config.name}`
                          )
                        : selectedOptions.length <= 2
                          ? selectedOptions
                              .map(val => config.options?.find(opt => opt.value === val)?.label || val)
                              .join(", ")
                          : selectedOptions.length +
                            " " +
                            t("requests-form.itemsSelected", {
                              count: selectedOptions.length,
                              defaultValue: "{{count}} selected",
                            })}
                    </span>
                  </span>
                  <ChevronDown className="w-4 h-4 text-slate-500" />
                </button>
              </Popover.Trigger>
              <Popover.Portal>
                <Popover.Content
                  className="bg-white p-3 rounded-md shadow-lg border border-slate-200 max-w-m max-h-70 overflow-y-auto z-50 p-7"
                  sideOffset={5}
                  align="start"
                >
                  {(config.options?.length ?? 0) > 0 ? (
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 gap-x-4">
                      {config.options?.map(option => (
                        <div key={option.value} className="flex items-center gap-2">
                          <Checkbox.Root
                            id={`${config.id}-${option.value}`}
                            checked={selectedOptions.includes(option.value)}
                            onCheckedChange={() => handleMultiselectToggle(option.value)}
                            className="h-4 w-4 rounded border border-slate-300 bg-white
                              data-[state=checked]:bg-violet-600 data-[state=checked]:border-violet-600 
                              focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-1"
                          >
                            <Checkbox.Indicator className="flex items-center justify-center text-white">
                              <Check className="h-3 w-3" />
                            </Checkbox.Indicator>
                          </Checkbox.Root>
                          <label
                            htmlFor={`${config.id}-${option.value}`}
                            className="text-sm text-slate-700 cursor-pointer"
                          >
                            {option.label}
                          </label>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-2 text-center text-slate-500 text-sm">
                      {t("requests-form.noOptionsAvailable", "No options available")}
                    </div>
                  )}
                  <Popover.Close
                    className="absolute top-2 right-2 rounded-full p-1 inline-flex items-center justify-center text-slate-400 hover:text-slate-500"
                    aria-label="Close"
                  >
                    <X className="h-4 w-4" />
                  </Popover.Close>
                </Popover.Content>
              </Popover.Portal>
            </Popover.Root>
          </div>
        );

      case InputType.SWITCH:
        return (
          <div className="flex items-center h-5">
            <Switch.Root
              id={config.id}
              checked={!!value}
              onCheckedChange={checked => updateField(config.name, checked as any)}
              className="w-10 h-5 bg-slate-300 rounded-full relative data-[state=checked]:bg-violet-600"
            >
              <Switch.Thumb
                className="block w-4 h-4 bg-white rounded-full transition-transform duration-100 
                           transform translate-x-0.5 will-change-transform data-[state=checked]:translate-x-5"
              />
            </Switch.Root>
          </div>
        );

      case InputType.CHECKBOX_GROUP:
        return (
          <div
            className={`grid ${getCheckboxGridClass(config.options?.length ?? 0, config.name)} gap-2 mt-1.5 
                         ${config.name === "days" ? "max-h-48 overflow-y-auto border border-slate-200 rounded-md p-2" : ""}`}
          >
            {config.options?.map(option => (
              <label key={option.value} className="flex items-center space-x-2 text-sm text-slate-700 cursor-pointer">
                <Checkbox.Root
                  id={`${config.id}-${option.value}`}
                  checked={Array.isArray(value) && value.includes(option.value)}
                  onCheckedChange={checked => handleCheckboxChange?.(config.name, option.value, checked)}
                  className="h-4 w-4 rounded border border-slate-300 bg-white
                          data-[state=checked]:bg-violet-600 data-[state=checked]:border-violet-600 
                          focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-1"
                >
                  <Checkbox.Indicator className="flex items-center justify-center text-white">
                    <Check className="h-3 w-3" />
                  </Checkbox.Indicator>
                </Checkbox.Root>
                <span>{config.name === "mapTypes" ? t(`mapTypes-list.${option.label}` as any) : option.label}
                </span>
              </label>
            ))}
          </div>
        );

      case InputType.MULTIDATE_SELECT:
        const selectedValues = Array.isArray(value) ? value : [];
        // Use calculated days for days field, otherwise use config options
        const options = config.name === "days" ? availableDays : config.options || [];

        const toggleDateSelection = (value: string) => {
          const isSelected = selectedValues.includes(value);
          const newSelection = isSelected ? selectedValues.filter(v => v !== value) : [...selectedValues, value];

          updateField(config.name, newSelection as any);
        };

        const getDisplayText = (type: "years" | "months" | "days" | "hours") => {
          if (selectedValues.length === 0) return t(`requests-form.select${type}`, `Select ${type}`);
          if (selectedValues.length <= 2) return selectedValues.join(", ");
          return (
            selectedValues.length +
            " " +
            t("requests-form.itemsSelected", { count: selectedValues.length, defaultValue: "{{count}} selected" })
          );
        };

        const getIcon = (type: "years" | "months" | "days" | "hours") => {
          switch (type) {
            case "years":
            case "days":
              return <Calendar className="w-4 h-4 mr-2" />;
            case "months":
              return <CalendarDays className="w-4 h-4 mr-2" />;
            case "hours":
              return <Clock className="w-4 h-4 mr-2" />;
          }
        };

        // For days field, check if we have enough selection to show options
        const canShowDaysOptions =
          config.name !== "days" || ((formData.years?.length ?? 0) > 0 && (formData.months?.length ?? 0) > 0);

        // Message to display when not enough selections
        const placeholderMessage =
          !canShowDaysOptions && config.name === "days"
            ? t("requests-form.selectYearsAndMonthsFirst", "Select years and months first")
            : t(`requests-form.select${capitalize(config.name)}`, `Select ${config.name}`);

        return (
          <div className="mt-1.5 space-y-3">
            <Popover.Root
              open={activeDatePopover === config.name}
              onOpenChange={open => setActiveDatePopover(open ? (config.name as any) : null)}
            >
              <Popover.Trigger asChild>
                <button
                  type="button"
                  disabled={!canShowDaysOptions && config.name === "days"}
                  className="inline-flex items-center justify-between w-full px-3 py-2 text-sm border border-slate-300 
                          rounded-md shadow-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-500 
                          focus:border-violet-500 disabled:bg-slate-100 disabled:text-slate-400 disabled:border-slate-200"
                >
                  <span className="inline-flex items-center">
                    {getIcon(config.name as any)}
                    <span className="truncate">
                      {selectedValues.length > 0 ? getDisplayText(config.name as any) : placeholderMessage}
                    </span>
                  </span>
                  <ChevronDown className="w-4 h-4 text-slate-500" />
                </button>
              </Popover.Trigger>
              <Popover.Portal>
                <Popover.Content
                  className="bg-white p-3 rounded-md shadow-lg border border-slate-200 max-w-m max-h-70 overflow-y-auto z-50 p-7"
                  sideOffset={5}
                  align="start"
                >
                  {options.length > 0 ? (
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 gap-x-4">
                      {options.map(option => (
                        <div key={option.value} className="flex items-center gap-2">
                          <Checkbox.Root
                            id={`${config.id}-${option.value}`}
                            checked={selectedValues.includes(option.value)}
                            onCheckedChange={() => toggleDateSelection(option.value)}
                            className="h-4 w-4 rounded border border-slate-300 bg-white
                                  data-[state=checked]:bg-violet-600 data-[state=checked]:border-violet-600 
                                  focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-1"
                          >
                            <Checkbox.Indicator className="flex items-center justify-center text-white">
                              <Check className="h-3 w-3" />
                            </Checkbox.Indicator>
                          </Checkbox.Root>
                          <label
                            htmlFor={`${config.id}-${option.value}`}
                            className="text-sm text-slate-700 cursor-pointer"
                          >
                            {config.name === "months" ? t(`months-list.${option.label}` as any) : option.label}
                          </label>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-2 text-center text-slate-500 text-sm">
                      {t("requests-form.noOptionsAvailable", "No options available")}
                    </div>
                  )}
                  <Popover.Close
                    className="absolute top-2 right-2 rounded-full p-1 inline-flex items-center justify-center text-slate-400 hover:text-slate-500"
                    aria-label="Close"
                  >
                    <X className="h-4 w-4" />
                  </Popover.Close>
                </Popover.Content>
              </Popover.Portal>
            </Popover.Root>
          </div>
        );

      case InputType.AREA_INPUT:
        return (
          <div className="mt-1.5 space-y-3">
            <div className="flex items-center gap-2">
              <Checkbox.Root
                id={`${config.id}-default`}
                defaultChecked
                onCheckedChange={checked => toggleDefaultArea(checked as boolean)}
                className="h-4 w-4 rounded border border-slate-300 bg-white
                        data-[state=checked]:bg-violet-600 data-[state=checked]:border-violet-600 
                        focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-1"
              >
                <Checkbox.Indicator className="flex items-center justify-center text-white">
                  <Check className="h-3 w-3" />
                </Checkbox.Indicator>
              </Checkbox.Root>
              <label htmlFor={`${config.id}-default`} className="text-sm text-slate-700">
                {t("requests-form.useDefaultArea", "Use default area")}
              </label>
            </div>
            <div className={`grid grid-cols-3 gap-3 ${useDefaultArea ? "opacity-50 pointer-events-none" : ""}`}>
              {/* Top input */}
              <div className="col-start-2 flex items-end justify-center">
                <input
                  type="number"
                  value={areaCoords.up}
                  onChange={e => handleAreaCoordsChange("up", e.target.value)}
                  min="-90"
                  max="90"
                  disabled={useDefaultArea}
                  className="w-full text-center rounded-md border border-slate-300 px-2 py-1 text-sm 
                           focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                  placeholder="North (-90-90)"
                />
              </div>

              {/* Left input */}
              <div className="col-start-1 row-start-2 flex items-center justify-end">
                <input
                  type="number"
                  value={areaCoords.left}
                  onChange={e => handleAreaCoordsChange("left", e.target.value)}
                  min="-180"
                  max="180"
                  disabled={useDefaultArea}
                  className="w-full text-center rounded-md border border-slate-300 px-2 py-1 text-sm 
                           focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                  placeholder="West (-180-180)"
                />
              </div>

              {/* Center - compass arrows */}
              <div className="col-start-2 row-start-2 flex items-center justify-center">
                <div className="relative w-14 h-14 flex items-center justify-center">
                  {/* Arrows, positioned with more space between them */}
                  <ArrowUp className="absolute top-0 left-1/2 -translate-x-1/2 w-5 h-5 text-violet-600" />
                  <ArrowDown className="absolute bottom-0 left-1/2 -translate-x-1/2 w-5 h-5 text-violet-600" />
                  <ArrowLeft className="absolute left-0 top-1/2 -translate-y-1/2 w-5 h-5 text-violet-600" />
                  <ArrowRight className="absolute right-0 top-1/2 -translate-y-1/2 w-5 h-5 text-violet-600" />

                  {/* Central circle - moved to the end to ensure it's on top (higher z-index) */}
                  <div className="absolute inset-0 flex items-center justify-center z-10">
                    <div className="w-4 h-4 rounded-full bg-violet-700 border-2 border-violet-300 shadow-sm"></div>
                  </div>
                </div>
              </div>

              {/* Right input */}
              <div className="col-start-3 row-start-2 flex items-center justify-start">
                <input
                  type="number"
                  value={areaCoords.right}
                  onChange={e => handleAreaCoordsChange("right", e.target.value)}
                  min="-180"
                  max="180"
                  disabled={useDefaultArea}
                  className="w-full text-center rounded-md border border-slate-300 px-2 py-1 text-sm 
                           focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                  placeholder="East (-180-180)"
                />
              </div>

              {/* Bottom input */}
              <div className="col-start-2 row-start-3 flex items-start justify-center">
                <input
                  type="number"
                  value={areaCoords.down}
                  onChange={e => handleAreaCoordsChange("down", e.target.value)}
                  min="-90"
                  max="90"
                  disabled={useDefaultArea}
                  className="w-full text-center rounded-md border border-slate-300 px-2 py-1 text-sm 
                           focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                  placeholder="South (-90-90)"
                />
              </div>
            </div>

            <p className="text-xs text-slate-500">
              {t(
                "requests-form.areaInputHelp",
                "Coordinates in degrees: North (-90-90), West (-180-180), South (-90-90), East (-180-180)"
              )}
            </p>
          </div>
        );

      default:
        return <div>Unsupported field type: {config.inputType}</div>;
    }
  };

  return (
    <FieldWrapper
      id={config.id}
      label={config.label ? t(config.label as any) : config.name}
      tooltip={config.tooltip ? t(config.tooltip as any) : undefined}
      error={error}
      required={config.validation?.required}
    >
      {renderField()}
    </FieldWrapper>
  );
};

/**
 * Helper function to determine the grid class for checkbox groups based on number of options
 */
function getCheckboxGridClass(optionsCount: number, fieldName: string): string {
  if (fieldName === "days") {
    return "grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10";
  }

  if (fieldName === "hours") {
    return "grid-cols-6";
  }

  if (fieldName === "years") {
    return "grid-cols-10";
  }

  if (optionsCount <= 4) {
    return "grid-cols-2";
  }

  if (optionsCount <= 8) {
    return "grid-cols-2 sm:grid-cols-3 md:grid-cols-4";
  }

  return "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5";
}

export default React.memo(DynamicFormField);
