import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { setLanguage } from "@/redux/slices/languageSlice";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { CheckIcon, GlobeIcon } from "lucide-react";
import { useTranslation } from "react-i18next";

/**
 * Language switcher component
 * Allows users to change the application language
 * @returns A dropdown menu for language selection
 */
export default function LanguageSwitcher() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const { currentLanguage, availableLanguages } = useAppSelector(state => state.language);

  /**
   * Handle language change
   * @param langCode The language code to switch to
   */
  const handleLanguageChange = (langCode: string) => {
    dispatch(setLanguage(langCode));
  };

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          className="flex items-center gap-1 rounded-md px-2 py-1 text-sm font-medium text-slate-800 hover:bg-slate-100 focus-ring"
          aria-label={t("language.switchLanguage")}
        >
          <GlobeIcon className="h-4 w-4" />
          <span>{currentLanguage.toUpperCase()}</span>
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content className="min-w-32 animate-in rounded-md bg-white p-1 shadow-md" sideOffset={5}>
          <DropdownMenu.Label className="px-2 py-1.5 text-xs text-slate-500">
            {t("language.selectLanguage")}
          </DropdownMenu.Label>

          {availableLanguages.map(language => (
            <DropdownMenu.Item
              key={language.code}
              className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-slate-100 data-[highlighted]:bg-slate-100"
              onClick={() => handleLanguageChange(language.code)}
            >
              {language.name}
              {currentLanguage === language.code && <CheckIcon className="ml-auto h-4 w-4 text-violet-600" />}
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
