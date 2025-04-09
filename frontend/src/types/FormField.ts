import { RequestForm } from "./Request";

/**
 * Types of form inputs available in the application
 */
export enum InputType {
  TEXT = "text",
  NUMBER = "number",
  CHECKBOX = "checkbox",
  SELECT = "select",
  MULTISELECT = "multiselect",
  SWITCH = "switch",
  CHECKBOX_GROUP = "checkbox-group",
  MULTIDATE_SELECT = "multidate-select",
  AREA_INPUT = "area-input",
}

/**
 * Tabs where form fields can be placed
 */
export enum TabPlace {
  BASIC_INFO = "basic-info",
  MAP_CONFIG = "map-config",
  ADDITIONAL_SETTINGS = "additional-settings",
}

/**
 * Option for select and checkbox group inputs
 */
export interface Option {
  value: string;
  label: string;
}

/**
 * Type alias for form field values
 */
export type FormFieldValue = string | boolean | string[];

/**
 * Base configuration for a form field
 */
export interface FormFieldConfig {
  id: string;
  name: keyof RequestForm;
  inputType: InputType;
  tabPlace: TabPlace;
  advancedField: boolean;
  optionalField: boolean;
  label?: string;
  placeholder?: string;
  tooltip?: string;
  defaultValue?: FormFieldValue;
  checked?: boolean;
  options?: Option[];
  validation?: {
    required?: boolean;
    pattern?: RegExp;
    minLength?: number;
    maxLength?: number;
    minValue?: number;
    maxValue?: number;
  };
  dependencies?: {
    field: string;
    value: FormFieldValue;
    condition: "equals" | "notEquals" | "includes" | "notIncludes";
  }[];
}

/**
 * Props needed to render a form field component
 */
export interface FormFieldProps {
  config: FormFieldConfig;
  value: FormFieldValue;
  errors: Record<string, string>;
  updateField: <K extends keyof RequestForm>(field: K, value: RequestForm[K]) => void;
  handleCheckboxChange?: <K extends keyof RequestForm>(
    field: K,
    value: string,
    checked: boolean | "indeterminate"
  ) => void;
  advancedMode: boolean;
}
