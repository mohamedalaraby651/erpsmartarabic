import * as React from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";

import { cn } from "@/lib/utils";

const TooltipProvider = TooltipPrimitive.Provider;

const Tooltip = TooltipPrimitive.Root;

const TooltipTrigger = TooltipPrimitive.Trigger;

const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 6, collisionPadding = 12, ...props }, ref) => {
  // Inherit document direction so Arabic text aligns correctly inside the portal.
  const dir =
    typeof document !== "undefined"
      ? (document.documentElement.getAttribute("dir") as "rtl" | "ltr" | undefined)
      : undefined;
  return (
    <TooltipPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      collisionPadding={collisionPadding}
      dir={dir}
      className={cn(
        // Sizing: cap at 280px but never exceed the viewport minus a safe gutter (handles 320px screens
        // and OS text-scaling in iOS Dynamic Type / Android font scale where wider text wraps to taller).
        "z-50 max-w-[min(280px,calc(100vw-1.5rem))] min-w-0 overflow-hidden rounded-md border bg-popover px-3 py-1.5 shadow-md text-popover-foreground",
        // Typography: use rem so it scales with user/OS font preferences, with a higher line-height for
        // Arabic diacritics and balanced wrapping for short multi-word labels.
        "text-[0.8125rem] leading-[1.55] [text-wrap:pretty]",
        // Wrap long words (Arabic compound / URLs) instead of overflowing.
        "whitespace-normal break-words hyphens-auto",
        "animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
        className,
      )}
      {...props}
    />
  );
});
TooltipContent.displayName = TooltipPrimitive.Content.displayName;

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };
