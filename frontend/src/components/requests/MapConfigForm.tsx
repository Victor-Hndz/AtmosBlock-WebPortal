import React, { useState } from "react";
import FormField from "./FormField";
import { RequestForm } from "@/redux/slices/requestsSlice";

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
const MapConfigForm: React.FC<MapConfigFormProps> = ({ formData, updateFormField, onNext, onPrevious }) => {
  const [errors, setErrors] = useState<Record<string, string>>({});

  /**
   * Validates the form fields before proceeding to the next step
   * @returns {boolean} True if validation passes, false otherwise
   */
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.pressureLevels?.length) {
      newErrors.pressureLevels = "At least one pressure level must be selected";
    }

    if (!formData.areaCovered?.length) {
      newErrors.areaCovered = "At least one area must be selected";
    }

    if (!formData.mapTypes?.length) {
      newErrors.mapTypes = "At least one map type must be selected";
    }

    if (!formData.mapRanges?.length) {
      newErrors.mapRanges = "At least one map range must be selected";
    }

    if (!formData.mapLevels?.length) {
      newErrors.mapLevels = "At least one map level must be selected";
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
      <h2 className="text-xl font-semibold">Map Configuration</h2>

      <FormField
        id="pressureLevels"
        label="Pressure Levels"
        tooltip="Select one or more pressure levels for your data visualization"
        error={errors.pressureLevels}
        required
      >
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {pressureLevelOptions.map(level => (
            <label key={level} className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={formData.pressureLevels?.includes(level) || false}
                onChange={e => {
                  const current = formData.pressureLevels || [];
                  if (e.target.checked) {
                    updateFormField("pressureLevels", [...current, level]);
                  } else {
                    updateFormField(
                      "pressureLevels",
                      current.filter(l => l !== level)
                    );
                  }
                }}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span>{level}</span>
            </label>
          ))}
        </div>
      </FormField>

      <FormField
        id="areaCovered"
        label="Area Coverage"
        tooltip="Select the geographical areas to be covered"
        error={errors.areaCovered}
        required
      >
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {areaCoverageOptions.map(area => (
            <label key={area} className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={formData.areaCovered?.includes(area) || false}
                onChange={e => {
                  const current = formData.areaCovered || [];
                  if (e.target.checked) {
                    updateFormField("areaCovered", [...current, area]);
                  } else {
                    updateFormField(
                      "areaCovered",
                      current.filter(a => a !== area)
                    );
                  }
                }}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span>{area}</span>
            </label>
          ))}
        </div>
      </FormField>

      <FormField
        id="mapTypes"
        label="Map Types"
        tooltip="Select the types of maps to generate"
        error={errors.mapTypes}
        required
      >
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {mapTypeOptions.map(type => (
            <label key={type} className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={formData.mapTypes?.includes(type) || false}
                onChange={e => {
                  const current = formData.mapTypes || [];
                  if (e.target.checked) {
                    updateFormField("mapTypes", [...current, type]);
                  } else {
                    updateFormField(
                      "mapTypes",
                      current.filter(t => t !== type)
                    );
                  }
                }}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span>{type}</span>
            </label>
          ))}
        </div>
      </FormField>

      <FormField
        id="mapRanges"
        label="Map Ranges"
        tooltip="Select the range options for your maps"
        error={errors.mapRanges}
        required
      >
        <div className="grid grid-cols-3 gap-2">
          {mapRangeOptions.map(range => (
            <label key={range} className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={formData.mapRanges?.includes(range) || false}
                onChange={e => {
                  const current = formData.mapRanges || [];
                  if (e.target.checked) {
                    updateFormField("mapRanges", [...current, range]);
                  } else {
                    updateFormField(
                      "mapRanges",
                      current.filter(r => r !== range)
                    );
                  }
                }}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span>{range}</span>
            </label>
          ))}
        </div>
      </FormField>

      <FormField
        id="mapLevels"
        label="Map Levels"
        tooltip="Select the vertical levels for your maps"
        error={errors.mapLevels}
        required
      >
        <div className="grid grid-cols-3 gap-2">
          {mapLevelOptions.map(level => (
            <label key={level} className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={formData.mapLevels?.includes(level) || false}
                onChange={e => {
                  const current = formData.mapLevels || [];
                  if (e.target.checked) {
                    updateFormField("mapLevels", [...current, level]);
                  } else {
                    updateFormField(
                      "mapLevels",
                      current.filter(l => l !== level)
                    );
                  }
                }}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span>{level}</span>
            </label>
          ))}
        </div>
      </FormField>

      <div className="flex justify-between">
        <button
          type="button"
          onClick={onPrevious}
          className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Previous
        </button>
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

export default MapConfigForm;
