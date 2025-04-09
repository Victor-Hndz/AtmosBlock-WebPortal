import { useState, useCallback } from "react";
import { REQUEST_FORM_STEPS } from "@/consts/requestsConsts";

interface UseRequestNavigationReturn {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  goToNextTab: (currentTab: string) => void;
  goToPreviousTab: (currentTab: string) => void;
}

/**
 * Custom hook to manage navigation between form steps
 * @param initialStep - The initial active step
 * @returns Object containing navigation state and methods
 */
export const useRequestNavigation = (initialStep = REQUEST_FORM_STEPS[0]): UseRequestNavigationReturn => {
  const [activeTab, setActiveTab] = useState(initialStep);

  /**
   * Navigate to the next tab
   * @param currentTab - The current tab ID
   */
  const goToNextTab = useCallback((currentTab: string) => {
    const currentIndex = REQUEST_FORM_STEPS.indexOf(currentTab);

    if (currentIndex < REQUEST_FORM_STEPS.length - 1) {
      setActiveTab(REQUEST_FORM_STEPS[currentIndex + 1]);
    }
  }, []);

  /**
   * Navigate to the previous tab
   * @param currentTab - The current tab ID
   */
  const goToPreviousTab = useCallback((currentTab: string) => {
    const currentIndex = REQUEST_FORM_STEPS.indexOf(currentTab);

    if (currentIndex > 0) {
      setActiveTab(REQUEST_FORM_STEPS[currentIndex - 1]);
    }
  }, []);

  /**
   * Set the active tab directly
   * @param tab - The tab to activate
   */
  const setTab = useCallback((tab: string) => {
    if (REQUEST_FORM_STEPS.includes(tab)) {
      setActiveTab(tab);
    }
  }, []);

  return {
    activeTab,
    setActiveTab: setTab,
    goToNextTab,
    goToPreviousTab,
  };
};
