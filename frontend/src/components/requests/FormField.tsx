import React from "react";
import * as Label from "@radix-ui/react-label";
import { HelpCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
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
  className?: string;
}

/**
 * FormField component that wraps form inputs with labels and tooltips
 * Provides consistent styling and accessibility features
 * Note: This component is designed to work independently from Radix UI Form context
 */
const FormField: React.FC<FormFieldProps> = ({
  id,
  label,
  children,
  tooltip,
  error,
  required = false,
  className = "",
}) => {
  const { t } = useTranslation();

  return (
    <div className={`mb-4 ${className}`}>
      <div className="flex items-center mb-1.5">
        <Label.Root htmlFor={id} className="text-sm font-medium text-slate-700 cursor-pointer">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </Label.Root>

        {tooltip && (
          <Tooltip content={tooltip} delay={200}>
            <button
              type="button"
              className="ml-1.5 rounded-full p-0.5 text-slate-400 hover:text-slate-600 
                        focus:outline-none focus:ring-2 focus:ring-violet-500"
              aria-label={t("navigation-tooltips.help", "Help about {{label}}", { label })}
            >
              <HelpCircle size={14} />
            </button>
          </Tooltip>
        )}
      </div>

      {children}

      {error && <p className="mt-1.5 text-xs text-red-500 font-medium">{error}</p>}
    </div>
  );
};

export default FormField;
