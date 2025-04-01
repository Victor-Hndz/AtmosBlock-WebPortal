import React from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";

/**
 * Props for the Tooltip component
 */
interface TooltipProps {
  children: React.ReactNode;
  content: React.ReactNode;
  side?: "top" | "right" | "bottom" | "left";
  align?: "start" | "center" | "end";
  delay?: number;
  className?: string;
}

/**
 * Tooltip component that displays additional information on hover
 * Uses Radix UI's tooltip primitive for accessibility and positioning
 */
export const Tooltip: React.FC<TooltipProps> = ({
  children,
  content,
  side = "top",
  align = "center",
  delay = 0,
  className = "",
}) => {
  return (
    <TooltipPrimitive.Provider delayDuration={delay}>
      <TooltipPrimitive.Root>
        <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content
            side={side}
            align={align}
            className={`bg-slate-900 text-white px-3 py-1.5 text-xs leading-4 rounded-md z-50 max-w-xs 
                      shadow-md animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out 
                      data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 ${className}`}
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
