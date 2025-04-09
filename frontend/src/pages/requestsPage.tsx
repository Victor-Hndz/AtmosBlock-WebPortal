import React, { useState, JSX } from "react";
import { useTranslation } from "react-i18next";
import FormAuthAlert from "@/components/requests/FormAuthAlert";
import FormTabsWrapper from "@/components/requests/FormTabsWrapper";
import AdvancedModeSwitch from "@/components/requests/AdvancedModeSwitch";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import Toast from "@/components/ui/Toast";
import "./requestsPage.css";

/**
 * RequestsPage component for handling user requests.
 * Contains a multi-step form for submitting requests with modern UI elements.
 * @returns {JSX.Element} The RequestsPage component.
 */
const RequestsPage: React.FC = (): JSX.Element => {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();

  // Advanced mode toggle state
  const [advancedMode, setAdvancedMode] = useState(false);

  // Toast notification state
  const { isOpen, setIsOpen, message, type, title, showToast } = useToast();

  return (
    <div className="request-container container mx-auto px-4 sm:px-6 py-6 sm:py-8 bg-white shadow-lg rounded-xl">
      <div className="header-container flex items-center justify-between">
        <h1 className="page-title">{t("requests-titles.title")}</h1>

        <AdvancedModeSwitch advancedMode={advancedMode} setAdvancedMode={setAdvancedMode} t={t} />
      </div>

      {!isAuthenticated && <FormAuthAlert t={t} />}

      {/* Form tabs for different request types */}
      <FormTabsWrapper advancedMode={advancedMode} showToast={showToast} t={t} />

      {/* Toast notifications with improved component */}
      <Toast open={isOpen} onOpenChange={setIsOpen} message={message} type={type} title={title} />
    </div>
  );
};

export default React.memo(RequestsPage);
