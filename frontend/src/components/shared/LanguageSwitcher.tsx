import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import * as Tooltip from "@radix-ui/react-tooltip";
import { CheckIcon, GlobeIcon } from "lucide-react";
import { useTranslation } from "react-i18next";

// WEB-308: inline SVG flags (flag emojis show as letters on Windows). Decorative: the language name is next to them.
const FLAG_CLASS = "h-3 w-[1.125rem] shrink-0 rounded-[2px] shadow-[0_0_0_1px_rgba(0,0,0,0.1)]";

/** Spain, without the coat of arms: it cannot be made out at this size */
const FlagES = () => (
  <svg data-bandera="es" aria-hidden="true" viewBox="0 0 750 500" className={FLAG_CLASS}>
    <rect width="750" height="500" fill="#c60b1e" />
    <rect y="125" width="750" height="250" fill="#ffc400" />
  </svg>
);

/** United Kingdom (Union Jack) for English */
const FlagGB = () => (
  <svg data-bandera="gb" aria-hidden="true" viewBox="0 0 60 30" className={FLAG_CLASS}>
    <clipPath id="bandera-gb-aspas">
      <path d="M30,15 h30 v15 z v15 h-30 z h-30 v-15 z v-15 h30 z" />
    </clipPath>
    <rect width="60" height="30" fill="#012169" />
    <path d="M0,0 L60,30 M60,0 L0,30" stroke="#fff" strokeWidth="6" />
    <path d="M0,0 L60,30 M60,0 L0,30" clipPath="url(#bandera-gb-aspas)" stroke="#c8102e" strokeWidth="4" />
    <path d="M30,0 v30 M0,15 h60" stroke="#fff" strokeWidth="10" />
    <path d="M30,0 v30 M0,15 h60" stroke="#c8102e" strokeWidth="6" />
  </svg>
);

/** Languages offered in the switcher (must match `supportedLngs` in i18n.ts) */
const LANGUAGES = [
  { code: "en", name: "English", Flag: FlagGB },
  { code: "es", name: "Español", Flag: FlagES },
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
              className="relative flex cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-slate-100 data-[highlighted]:bg-slate-100"
              onClick={() => i18n.changeLanguage(language.code)}
            >
              <language.Flag />
              {language.name}
              {currentLanguage === language.code && <CheckIcon className="ml-auto h-4 w-4 text-violet-600" />}
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
