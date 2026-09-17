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
  .use(Backend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: "es",
    supportedLngs: ["en", "es"],
    debug: import.meta.env.DEV,
    ns: ["common"],
    defaultNS: "common",
    interpolation: {
      escapeValue: false,
    },
    backend: {
      loadPath: "/locales/{{lng}}/{{ns}}.json",
    },
    detection: {
      order: ["localStorage", "navigator"],
      caches: ["localStorage"],
    },
    react: {
      useSuspense: true,
    },
  });

export default i18n;
