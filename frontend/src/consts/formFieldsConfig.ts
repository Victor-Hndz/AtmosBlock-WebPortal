import { FormFieldConfig, InputType, TabPlace } from "@/types/FormField";
import {
  VARIABLE_NAME_OPTIONS,
  AVAILABLE_YEARS,
  AVAILABLE_YEARS_ADVANCED,
  AVAILABLE_MONTHS,
  AVAILABLE_HOURS,
  PRESSURE_LEVELS,
  PRESSURE_LEVELS_ADVANCED,
  MAP_TYPES,
  FILE_FORMAT_OPTIONS,
  MAP_LEVELS,
} from "./requestsConsts";
import { capitalize, extractMonthNumber } from "@/utils/utilities";

/**
 * Complete definition of all form fields used in the request form
 * Organized by their placement in tabs and their configuration
 */
export const FORM_FIELDS_CONFIG: FormFieldConfig[] = [
  // Basic Info Tab
  {
    id: "variableName",
    name: "variableName",
    inputType: InputType.SELECT,
    tabPlace: TabPlace.BASIC_INFO,
    advancedField: false,
    optionalField: false,
    showInAdvancedMode: true,
    label: "requests-form.variableName",
    tooltip: "requests-form.variableNameTooltip",
    options: VARIABLE_NAME_OPTIONS.map(variable => ({ value: variable, label: capitalize(variable) })),
    validation: {
      required: true,
    },
  },
  {
    id: "years",
    name: "years",
    inputType: InputType.MULTIDATE_SELECT,
    tabPlace: TabPlace.BASIC_INFO,
    advancedField: false,
    optionalField: false,
    showInAdvancedMode: false,
    label: "requests-form.years",
    tooltip: "requests-form.yearsTooltip",
    options: AVAILABLE_YEARS.map(year => ({ value: year, label: year })),
    defaultValue: [],
    validation: {
      required: true,
    },
  },
  {
    id: "yearsAdvanced",
    name: "years",
    inputType: InputType.CHECKBOX_GROUP,
    tabPlace: TabPlace.BASIC_INFO,
    advancedField: true,
    optionalField: false,
    showInAdvancedMode: true,
    label: "requests-form.yearsAdvanced",
    tooltip: "requests-form.yearsAdvancedTooltip",
    options: AVAILABLE_YEARS_ADVANCED.map(year => ({ value: year, label: year })),
    defaultValue: [],
    validation: {
      required: true,
    },
  },
  {
    id: "months",
    name: "months",
    inputType: InputType.MULTIDATE_SELECT,
    tabPlace: TabPlace.BASIC_INFO,
    advancedField: false,
    optionalField: false,
    showInAdvancedMode: true,
    label: "requests-form.months",
    tooltip: "requests-form.monthsTooltip",
    options: AVAILABLE_MONTHS.map(month => ({ value: extractMonthNumber(month), label: month })),
    defaultValue: [],
    validation: {
      required: true,
    },
  },
  {
    id: "days",
    name: "days",
    inputType: InputType.MULTIDATE_SELECT,
    tabPlace: TabPlace.BASIC_INFO,
    advancedField: false,
    optionalField: false,
    showInAdvancedMode: true,
    label: "requests-form.days",
    tooltip: "requests-form.daysTooltip",
    defaultValue: [],
    validation: {
      required: true,
    },
  },
  {
    id: "hours",
    name: "hours",
    inputType: InputType.CHECKBOX_GROUP,
    tabPlace: TabPlace.BASIC_INFO,
    advancedField: false,
    optionalField: false,
    showInAdvancedMode: true,
    label: "requests-form.hours",
    tooltip: "requests-form.hoursTooltip",
    options: AVAILABLE_HOURS.map(hour => ({ value: hour, label: `${hour.toString().padStart(2, "0")}:00` })),
    defaultValue: [],
    validation: {
      required: true,
    },
  },

  // Map Config Tab
  {
    id: "pressureLevels",
    name: "pressureLevels",
    inputType: InputType.SELECT,
    tabPlace: TabPlace.BASIC_INFO,
    advancedField: false,
    optionalField: false,
    showInAdvancedMode: false,
    label: "requests-form.pressureLevels",
    tooltip: "requests-form.pressureLevelsTooltip",
    options: PRESSURE_LEVELS.map(level => ({ value: level, label: `${level}hPa` })),
    validation: {
      required: true,
    },
  },
  {
    id: "pressureLevelsAdvanced",
    name: "pressureLevels",
    inputType: InputType.MULTISELECT,
    tabPlace: TabPlace.BASIC_INFO,
    advancedField: true,
    optionalField: false,
    showInAdvancedMode: true,
    label: "requests-form.pressureLevelsAdvanced",
    tooltip: "requests-form.pressureLevelsAdvancedTooltip",
    options: PRESSURE_LEVELS_ADVANCED.map(level => ({ value: level, label: `${level}hPa` })),
    defaultValue: [],
    validation: {
      required: true,
    },
  },

  // Map Config Tab
  {
    id: "areaCovered",
    name: "areaCovered",
    inputType: InputType.AREA_INPUT,
    tabPlace: TabPlace.MAP_CONFIG,
    advancedField: false,
    optionalField: false,
    showInAdvancedMode: true,
    label: "requests-form.areaCovered",
    tooltip: "requests-form.areaCoveredTooltip",
    defaultValue: "90,-180,-90,180",
    validation: {
      required: true,
    },
  },
  {
    id: "mapTypes",
    name: "mapTypes",
    inputType: InputType.CHECKBOX_GROUP,
    tabPlace: TabPlace.MAP_CONFIG,
    advancedField: false,
    optionalField: false,
    showInAdvancedMode: true,
    label: "requests-form.mapTypes",
    tooltip: "requests-form.mapTypesTooltip",
    options: MAP_TYPES.map(type => ({ value: type, label: type })),
    validation: {
      required: true,
    },
  },
  {
    id: "mapLevels",
    name: "mapLevels",
    inputType: InputType.SELECT,
    tabPlace: TabPlace.MAP_CONFIG,
    advancedField: true,
    optionalField: true,
    showInAdvancedMode: true,
    label: "requests-form.mapLevels",
    tooltip: "requests-form.mapLevelsTooltip",
    options: MAP_LEVELS.map(level => ({ value: level, label: level })),
    validation: {
      required: true,
    },
  },

  // Additional Settings Tab
  {
    id: "fileFormat",
    name: "fileFormat",
    inputType: InputType.SELECT,
    tabPlace: TabPlace.ADDITIONAL_SETTINGS,
    advancedField: false,
    optionalField: true,
    showInAdvancedMode: true,
    label: "requests-form.fileFormat",
    tooltip: "requests-form.fileFormatTooltip",
    options: FILE_FORMAT_OPTIONS.map(format => ({ value: format, label: format.toUpperCase() })),
  },
  {
    id: "noMaps",
    name: "noMaps",
    inputType: InputType.SWITCH,
    tabPlace: TabPlace.ADDITIONAL_SETTINGS,
    advancedField: true,
    optionalField: true,
    showInAdvancedMode: true,
    label: "requests-form.noMaps",
    tooltip: "requests-form.noMapsTooltip",
    defaultValue: false,
  },
  {
    id: "noData",
    name: "noData",
    inputType: InputType.SWITCH,
    tabPlace: TabPlace.ADDITIONAL_SETTINGS,
    advancedField: true,
    optionalField: true,
    showInAdvancedMode: true,
    label: "requests-form.noData",
    tooltip: "requests-form.noDataTooltip",
    defaultValue: false,
  },
  {
    id: "omp",
    name: "omp",
    inputType: InputType.SWITCH,
    tabPlace: TabPlace.ADDITIONAL_SETTINGS,
    advancedField: true,
    optionalField: true,
    showInAdvancedMode: true,
    label: "requests-form.omp",
    tooltip: "requests-form.ompTooltip",
    defaultValue: false,
  },
  {
    id: "mpi",
    name: "mpi",
    inputType: InputType.SWITCH,
    tabPlace: TabPlace.ADDITIONAL_SETTINGS,
    advancedField: true,
    optionalField: true,
    showInAdvancedMode: true,
    label: "requests-form.mpi",
    tooltip: "requests-form.mpiTooltip",
    defaultValue: false,
  },
];

/**
 * Get form fields for a specific tab
 * @param tabPlace - The tab to get fields for
 * @param advancedMode - Whether advanced mode is enabled
 * @returns Array of form field configurations
 */
export function getFormFieldsForTab(tabPlace: TabPlace, advancedMode: boolean = false): FormFieldConfig[] {
  return FORM_FIELDS_CONFIG.filter(field => {
    // Filter by tab place
    const isCorrectTab = field.tabPlace === tabPlace;

    // Handle advanced field visibility
    const isVisibleByMode = !field.advancedField || (field.advancedField && advancedMode);

    return isCorrectTab && isVisibleByMode;
  });
}

/**
 * Get a specific form field configuration by ID
 * @param fieldId - The ID of the field to retrieve
 * @returns The form field configuration or undefined if not found
 */
export function getFormFieldById(fieldId: string): FormFieldConfig | undefined {
  return FORM_FIELDS_CONFIG.find(field => field.id === fieldId);
}

/**
 * Check if a field should be shown based on its dependencies
 * @param field - The field configuration to check
 * @param formData - The current form data
 * @returns Whether the field should be shown
 */
export function shouldShowField(field: FormFieldConfig, formData: Record<string, any>): boolean {
  // If no dependencies, always show
  if (!field.dependencies || field.dependencies.length === 0) {
    return true;
  }

  // Check all dependencies - all must be satisfied
  return field.dependencies.every(dependency => {
    const dependencyValue = formData[dependency.field];

    switch (dependency.condition) {
      case "equals":
        return dependencyValue === dependency.value;
      case "notEquals":
        return dependencyValue !== dependency.value;
      case "includes":
        return Array.isArray(dependencyValue) && dependencyValue.includes(dependency.value);
      case "notIncludes":
        return Array.isArray(dependencyValue) && !dependencyValue.includes(dependency.value);
      default:
        return true;
    }
  });
}
