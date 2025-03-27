import React from "react";
import * as Label from "@radix-ui/react-label";
import { HelpCircle } from "lucide-react";
import { Tooltip } from "../ui/Tooltip";

/**
 * Props for the FormField component
 */
interface FormFieldProps {
  id: string;
  label: string;
  children: React.ReactNode;
  tooltip?: string;
  error?: string;
  required?: boolean;
}

/**
 * FormField component that wraps form inputs with labels and tooltips
 */
const FormField: React.FC<FormFieldProps> = ({ id, label, children, tooltip, error, required = false }) => {
  return (
    <div className="mb-4">
      <div className="flex items-center mb-1">
        <Label.Root htmlFor={id} className="text-sm font-medium text-gray-700">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </Label.Root>
        {tooltip && (
          <Tooltip content={tooltip}>
            <button type="button" className="ml-1">
              <HelpCircle size={16} className="text-gray-400" />
            </button>
          </Tooltip>
        )}
      </div>
      {children}
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
};

export default FormField;
