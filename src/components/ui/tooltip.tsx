import * as React from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";

import { cn } from "@/lib/utils";

const TooltipProvider = TooltipPrimitive.Provider;

const Tooltip = TooltipPrimitive.Root;

const TooltipTrigger = TooltipPrimitive.Trigger;

const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 6, collisionPadding = 8, ...props }, ref) => {
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
        "z-50 max-w-[280px] overflow-hidden rounded-md border bg-popover px-3 py-1.5 text-xs leading-relaxed text-popover-foreground shadow-md",
        // Keep Arabic readable: wrap, no force-rtl on portal — Radix sets `dir` for us above.
        "whitespace-normal break-words",
        "animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
        className,
      )}
      {...props}
    />
  );
});
TooltipContent.displayName = TooltipPrimitive.Content.displayName;

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };
