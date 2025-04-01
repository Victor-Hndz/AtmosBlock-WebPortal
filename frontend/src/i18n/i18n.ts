import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import Backend from "i18next-http-backend";

/**
 * Initialize i18next for internationalization support
 * - Loads common from public/locales/{language}/common.json
 * - Auto-detects user language preferences
 * - Includes fallback languages
 * - Provides debug information in development mode
 */
i18n
  // Load translations from the server
  .use(Backend)
  // Detect user language
  .use(LanguageDetector)
  // Pass the i18n instance to react-i18next
  .use(initReactI18next)
  // Initialize i18next
  .init({
    // Default language
    fallbackLng: "es",
    // Supported languages
    supportedLngs: ["en", "es"],
    // Debug in development only
    debug: import.meta.env.DEV,
    // Default namespace
    defaultNS: "common",
    // Interpolation configuration
    interpolation: {
      // React already escapes values
      escapeValue: false,
    },
    // Backend configuration
    backend: {
      // Translation files location
      loadPath: "/locales/{{lng}}/{{ns}}.json",
    },
    // Detection options
    detection: {
      // Order of detection methods
      order: ["localStorage", "navigator"],
      // Cache detected language
      caches: ["localStorage"],
    },
    // React config
    react: {
      // Enable suspense for translation loading
      useSuspense: true,
    },
  });

// Preload the common namespace to avoid the error
const currentLanguage = i18n.language || "es";

i18n.changeLanguage(currentLanguage).then(() => {
  i18n.loadNamespaces("common");
});

export default i18n;
