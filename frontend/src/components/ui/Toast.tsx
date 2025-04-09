import React from "react";
import * as ToastPrimitive from "@radix-ui/react-toast";
import { X, AlertCircle, CheckCircle, AlertTriangle, Info } from "lucide-react";
import { useTranslation } from "react-i18next";
import "./Toast.css";

export type ToastType = "success" | "error" | "warning" | "info";

interface ToastProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  message: string;
  title?: string;
  type?: ToastType;
  duration?: number;
}

/**
 * Toast component for displaying notifications
 * @param {boolean} open - Whether the toast is visible
 * @param {function} onOpenChange - Function to call when visibility changes
 * @param {string} message - The message to display in the toast
 * @param {string} title - Optional custom title for the toast
 * @param {ToastType} type - Type of toast: success, error, warning, or info
 * @param {number} duration - Duration in milliseconds before auto-dismissal
 * @returns {JSX.Element} Toast component
 */
/** */
const Toast: React.FC<ToastProps> = ({ open, onOpenChange, message, title, type = "info", duration = 5000 }) => {
  const { t } = useTranslation();

  // Default titles based on type
  const defaultTitles: Record<ToastType, string> = {
    success: t("toast.success", "Success"),
    error: t("toast.error", "Error"),
    warning: t("toast.warning", "Warning"),
    info: t("toast.info", "Information"),
  };

  // Icon based on type
  const IconComponent = {
    success: CheckCircle,
    error: AlertCircle,
    warning: AlertTriangle,
    info: Info,
  }[type];

  return (
    <ToastPrimitive.Provider swipeDirection="right">
      <ToastPrimitive.Root
        className={`toast-root toast-type-${type}`}
        open={open}
        onOpenChange={onOpenChange}
        duration={duration}
      >
        <div className="toast-icon-container">
          <IconComponent className={`toast-icon toast-icon-${type}`} size={18} />
        </div>
        <div className="toast-content">
          <ToastPrimitive.Title className="toast-title">{title ?? defaultTitles[type]}</ToastPrimitive.Title>
          <ToastPrimitive.Description className="toast-description">{message}</ToastPrimitive.Description>
        </div>
        <ToastPrimitive.Action className="toast-close" asChild altText={t("buttons.close")}>
          <button aria-label={t("buttons.close")}>
            <X size={14} />
          </button>
        </ToastPrimitive.Action>
      </ToastPrimitive.Root>
      <ToastPrimitive.Viewport className="toast-viewport" />
    </ToastPrimitive.Provider>
  );
};

export default Toast;
