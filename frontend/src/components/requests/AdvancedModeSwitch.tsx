import React from "react";
import { HelpCircle } from "lucide-react";
import * as Switch from "@radix-ui/react-switch";
import { Tooltip } from "@/components/ui/Tooltip";
import { TFunction } from "i18next";

interface AdvancedModeSwitchProps {
  advancedMode: boolean;
  setAdvancedMode: (value: boolean) => void;
  t: TFunction;
}

const AdvancedModeSwitch: React.FC<AdvancedModeSwitchProps> = ({ advancedMode, setAdvancedMode, t }) => {
  return (
    <div className="mode-toggle">
      <label htmlFor="advanced-mode" className="mode-label text-sm font-medium text-slate-700">
        {t("requests-form.advancedMode", "Advanced Mode")}
      </label>

      <div className="flex items-center gap-2">
        <Switch.Root
          id="advanced-mode"
          checked={advancedMode}
          onCheckedChange={setAdvancedMode}
          className="switch-root"
          aria-label={t("requests-form.toggleAdvancedMode", "Toggle advanced mode")}
        >
          <Switch.Thumb className="switch-thumb" />
        </Switch.Root>

        <Tooltip
          content={t(
            "requests-form.advancedModeTooltip",
            "Enable advanced mode to access additional configuration options"
          )}
        >
          <button
            type="button"
            className="text-slate-400 hover:text-slate-600 transition-colors duration-200"
            aria-label={t("navigation-tooltips.help", "Help")}
          >
            <HelpCircle size={16} />
          </button>
        </Tooltip>
      </div>
    </div>
  );
};

export default React.memo(AdvancedModeSwitch);
