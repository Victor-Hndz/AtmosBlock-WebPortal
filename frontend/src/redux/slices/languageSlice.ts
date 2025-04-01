import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import i18n from "@/i18n/i18n";

interface LanguageState {
  currentLanguage: string;
  availableLanguages: { code: string; name: string }[];
}

/**
 * Initial state for language settings
 * Includes current language and available options
 */
const initialState: LanguageState = {
  currentLanguage: i18n.language || "en",
  availableLanguages: [
    { code: "en", name: "English" },
    { code: "es", name: "Español" },
  ],
};

/**
 * Redux slice for language management
 * Allows changing the application language
 */
const languageSlice = createSlice({
  name: "language",
  initialState,
  reducers: {
    /**
     * Changes the application language
     * @param state Current language state
     * @param action Action with language code payload
     */
    setLanguage: (state, action: PayloadAction<string>) => {
      const languageCode = action.payload;
      // Validate that the language is supported
      if (state.availableLanguages.some(lang => lang.code === languageCode)) {
        state.currentLanguage = languageCode;
        // Change i18n language
        i18n.changeLanguage(languageCode);
        // Store selection in localStorage for persistence
        localStorage.setItem("i18nextLng", languageCode);
      }
    },
  },
});

export const { setLanguage } = languageSlice.actions;
export default languageSlice.reducer;
