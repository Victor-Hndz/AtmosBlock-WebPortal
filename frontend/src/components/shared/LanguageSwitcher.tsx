import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import * as Tooltip from "@radix-ui/react-tooltip";
import { CheckIcon, GlobeIcon } from "lucide-react";
import { useTranslation } from "react-i18next";

/** Languages offered in the switcher (must match `supportedLngs` in i18n.ts) */
const LANGUAGES = [
  { code: "en", name: "English" },
  { code: "es", name: "Español" },
];

/**
 * Language switcher component
 * Allows users to change the application language
 * @returns A dropdown menu for language selection
 */
export default function LanguageSwitcher() {
  // i18next is the single source of truth: its detector restores the language and caches every change in localStorage
  const { t, i18n } = useTranslation();
  const currentLanguage = i18n.resolvedLanguage ?? "es";

  return (
    // modal={false}: a modal menu locks page scroll and hides the scrollbar, shifting the fixed header and footer
    <DropdownMenu.Root modal={false}>
      <Tooltip.Provider delayDuration={300}>
        <Tooltip.Root>
          {/* Closing the menu gives focus back to the button from nowhere (no relatedTarget): no tooltip then, only on Tab */}
          <Tooltip.Trigger asChild onFocus={e => !e.relatedTarget && e.preventDefault()}>
            <DropdownMenu.Trigger asChild>
              <button
                className="flex items-center gap-1 rounded-md px-2 py-1 text:white hover:text-blue-300"
                aria-label={t("language.switchLanguage")}
              >
                <GlobeIcon className="h-4 w-4" />
                <span>{currentLanguage.toUpperCase()}</span>
              </button>
            </DropdownMenu.Trigger>
          </Tooltip.Trigger>
          <Tooltip.Portal>
            <Tooltip.Content
              className="tooltip-content bg-gray-900 text-white px-4 py-2 rounded-md text-sm z-50 shadow-md"
              sideOffset={5}
            >
              {t("navigation-tooltips.language")}
              <Tooltip.Arrow className="tooltip-arrow" />
            </Tooltip.Content>
          </Tooltip.Portal>
        </Tooltip.Root>
      </Tooltip.Provider>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className="mt-3 mr-1 min-w-32 animate-in rounded-md bg-white p-1 shadow-md"
          sideOffset={5}
        >
          <DropdownMenu.Label className="px-2 py-1.5 text-xs text-slate-500">
            {t("language.selectLanguage")}
          </DropdownMenu.Label>

          {LANGUAGES.map(language => (
            <DropdownMenu.Item
              key={language.code}
              className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-slate-100 data-[highlighted]:bg-slate-100"
              onClick={() => i18n.changeLanguage(language.code)}
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
