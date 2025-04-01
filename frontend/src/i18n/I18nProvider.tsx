import React, { Suspense } from "react";
import { I18nextProvider } from "react-i18next";
import i18n from "./i18n";

interface I18nProviderProps {
  children: React.ReactNode;
}

/**
 * I18nProvider Component
 *
 * A wrapper component that ensures i18n is properly initialized before rendering
 * the application. Uses Suspense to show a loading indicator while translations
 * are being loaded.
 */
const I18nProvider: React.FC<I18nProviderProps> = ({ children }) => {
  return (
    <I18nextProvider i18n={i18n}>
      <Suspense fallback={<div>Loading translations...</div>}>{children}</Suspense>
    </I18nextProvider>
  );
};

export default I18nProvider;
