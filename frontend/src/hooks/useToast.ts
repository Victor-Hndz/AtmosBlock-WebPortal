import { useState } from "react";
import { ToastType } from "@/components/ui/Toast";

interface ToastState {
  isOpen: boolean;
  message: string;
  title?: string;
  type: ToastType;
}

interface UseToastReturn extends ToastState {
  setIsOpen: (isOpen: boolean) => void;
  showToast: (message: string, type?: ToastType, title?: string) => void;
  showSuccess: (message: string, title?: string) => void;
  showError: (message: string, title?: string) => void;
  showWarning: (message: string, title?: string) => void;
  showInfo: (message: string, title?: string) => void;
}

/**
 * Custom hook for managing toast notifications
 * @returns {Object} Toast state and control methods
 */
export const useToast = (): UseToastReturn => {
  const [toast, setToast] = useState<ToastState>({
    isOpen: false,
    message: "",
    type: "info",
  });

  /**
   * Show a toast notification
   * @param {string} message - Message to display
   * @param {ToastType} type - Type of toast (success, error, warning, info)
   * @param {string} title - Optional custom title
   */
  const showToast = (message: string, type: ToastType = "info", title?: string) => {
    setToast({
      isOpen: true,
      message,
      type,
      title,
    });
  };

  /**
   * Set the open state of the toast
   * @param {boolean} isOpen - Whether the toast should be visible
   */
  const setIsOpen = (isOpen: boolean) => {
    setToast(prev => ({ ...prev, isOpen }));
  };

  // Convenience methods for different toast types
  const showSuccess = (message: string, title?: string) => showToast(message, "success", title);
  const showError = (message: string, title?: string) => showToast(message, "error", title);
  const showWarning = (message: string, title?: string) => showToast(message, "warning", title);
  const showInfo = (message: string, title?: string) => showToast(message, "info", title);

  return {
    ...toast,
    setIsOpen,
    showToast,
    showSuccess,
    showError,
    showWarning,
    showInfo,
  };
};
