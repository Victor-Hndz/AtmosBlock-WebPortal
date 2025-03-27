import React from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";

/**
 * Props for the Tooltip component
 */
interface TooltipProps {
  children: React.ReactNode;
  content: React.ReactNode;
  side?: "top" | "right" | "bottom" | "left";
  delay?: number;
}

/**
 * Tooltip component that displays additional information on hover
 */
export const Tooltip: React.FC<TooltipProps> = ({ children, content, side = "top", delay = 0 }) => {
  return (
    <TooltipPrimitive.Provider>
      <TooltipPrimitive.Root delayDuration={delay}>
        <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content
            side={side}
            className="bg-slate-900 text-white px-3 py-1.5 text-xs rounded-md z-50 max-w-xs"
            sideOffset={5}
          >
            {content}
            <TooltipPrimitive.Arrow className="fill-slate-900" />
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  );
};
