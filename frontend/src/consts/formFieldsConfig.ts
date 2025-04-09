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
  MAP_RANGES,
  FILE_FORMAT_OPTIONS,
} from "./requestsConsts";

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
    label: "requests-form.variableName",
    tooltip: "requests-form.variableNameTooltip",
    options: VARIABLE_NAME_OPTIONS.map(variable => ({ value: variable, label: variable })),
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
    label: "requests-form.months",
    tooltip: "requests-form.monthsTooltip",
    options: AVAILABLE_MONTHS.map(month => ({ value: month, label: month })),
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
    label: "requests-form.hours",
    tooltip: "requests-form.hoursTooltip",
    options: AVAILABLE_HOURS.map(hour => ({ value: hour, label: hour })),
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
    label: "requests-form.pressureLevels",
    tooltip: "requests-form.pressureLevelsTooltip",
    options: PRESSURE_LEVELS.map(level => ({ value: level, label: level })),
    validation: {
      required: true,
    },
  },
  {
    id: "pressureLevelsAdvanced",
    name: "pressureLevels",
    inputType: InputType.SELECT,
    tabPlace: TabPlace.BASIC_INFO,
    advancedField: true,
    optionalField: false,
    label: "requests-form.pressureLevelsAvanced",
    tooltip: "requests-form.pressureLevelsAvancedTooltip",
    options: PRESSURE_LEVELS_ADVANCED.map(level => ({ value: level, label: level })),
    validation: {
      required: true,
    },
  },
  {
    id: "areaCovered",
    name: "areaCovered",
    inputType: InputType.AREA_INPUT,
    tabPlace: TabPlace.MAP_CONFIG,
    advancedField: false,
    optionalField: false,
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
    label: "requests-form.mapTypes",
    tooltip: "requests-form.mapTypesTooltip",
    options: MAP_TYPES.map(type => ({ value: type, label: type })),
    validation: {
      required: true,
    },
  },
  {
    id: "mapRanges",
    name: "mapRanges",
    inputType: InputType.CHECKBOX_GROUP,
    tabPlace: TabPlace.MAP_CONFIG,
    advancedField: false,
    optionalField: false,
    label: "requests-form.mapRanges",
    tooltip: "requests-form.mapRangesTooltip",
    options: MAP_RANGES.map(range => ({ value: range, label: range })),
    validation: {
      required: true,
    },
  },
  {
    id: "mapLevels",
    name: "mapLevels",
    inputType: InputType.NUMBER,
    tabPlace: TabPlace.MAP_CONFIG,
    advancedField: true,
    optionalField: true,
    label: "requests-form.mapLevels",
    tooltip: "requests-form.mapLevelsTooltip",
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
    label: "requests-form.fileFormat",
    tooltip: "requests-form.fileFormatTooltip",
    options: FILE_FORMAT_OPTIONS.map(format => ({ value: format, label: format })),
  },
  {
    id: "tracking",
    name: "tracking",
    inputType: InputType.SWITCH,
    tabPlace: TabPlace.ADDITIONAL_SETTINGS,
    advancedField: false,
    optionalField: true,
    label: "requests-form.tracking",
    tooltip: "requests-form.trackingTooltip",
    defaultValue: false,
  },
  {
    id: "noCompile",
    name: "noCompile",
    inputType: InputType.SWITCH,
    tabPlace: TabPlace.ADDITIONAL_SETTINGS,
    advancedField: true,
    optionalField: true,
    label: "requests-form.noCompile",
    tooltip: "requests-form.noCompileTooltip",
    defaultValue: false,
  },
  {
    id: "noExecute",
    name: "noExecute",
    inputType: InputType.SWITCH,
    tabPlace: TabPlace.ADDITIONAL_SETTINGS,
    advancedField: true,
    optionalField: true,
    label: "requests-form.noExecute",
    tooltip: "requests-form.noExecuteTooltip",
    defaultValue: false,
  },
  {
    id: "noMaps",
    name: "noMaps",
    inputType: InputType.SWITCH,
    tabPlace: TabPlace.ADDITIONAL_SETTINGS,
    advancedField: true,
    optionalField: true,
    label: "requests-form.noMaps",
    tooltip: "requests-form.noMapsTooltip",
    defaultValue: false,
  },
  {
    id: "animation",
    name: "animation",
    inputType: InputType.SWITCH,
    tabPlace: TabPlace.ADDITIONAL_SETTINGS,
    advancedField: false,
    optionalField: true,
    label: "requests-form.animation",
    tooltip: "requests-form.animationTooltip",
    defaultValue: false,
  },
  {
    id: "omp",
    name: "omp",
    inputType: InputType.SWITCH,
    tabPlace: TabPlace.ADDITIONAL_SETTINGS,
    advancedField: true,
    optionalField: true,
    label: "requests-form.omp",
    tooltip: "requests-form.ompTooltip",
    defaultValue: false,
  },
  {
    id: "nThreads",
    name: "nThreads",
    inputType: InputType.SWITCH,
    tabPlace: TabPlace.ADDITIONAL_SETTINGS,
    advancedField: true,
    optionalField: true,
    label: "requests-form.nThreads",
    tooltip: "requests-form.nThreadsTooltip",
    defaultValue: false,
    dependencies: [
      {
        field: "omp",
        value: true,
        condition: "equals",
      },
    ],
  },
  {
    id: "mpi",
    name: "mpi",
    inputType: InputType.SWITCH,
    tabPlace: TabPlace.ADDITIONAL_SETTINGS,
    advancedField: true,
    optionalField: true,
    label: "requests-form.mpi",
    tooltip: "requests-form.mpiTooltip",
    defaultValue: false,
  },
  {
    id: "nProces",
    name: "nProces",
    inputType: InputType.SWITCH,
    tabPlace: TabPlace.ADDITIONAL_SETTINGS,
    advancedField: true,
    optionalField: true,
    label: "requests-form.nProces",
    tooltip: "requests-form.nProcesTooltip",
    defaultValue: false,
    dependencies: [
      {
        field: "mpi",
        value: true,
        condition: "equals",
      },
    ],
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
