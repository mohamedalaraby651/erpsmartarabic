/**
 * Canonical Sheet — side panel via Radix Dialog.
 *
 * @canonicalState Canonical
 * @adr ADR-0003
 * @since UX-1C
 *
 * Uses logical `side="start" | "end"` instead of `left | right`, so RTL
 * automatically flips the panel to the correct edge.
 */
import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export const Sheet = DialogPrimitive.Root;
export const SheetTrigger = DialogPrimitive.Trigger;
export const SheetClose = DialogPrimitive.Close;

export type SheetSide = "start" | "end" | "top" | "bottom";

const sideClassMap: Record<SheetSide, string> = {
  start: "inset-y-0 start-0 h-full w-3/4 sm:max-w-sm border-e",
  end: "inset-y-0 end-0 h-full w-3/4 sm:max-w-sm border-s",
  top: "inset-x-0 top-0 w-full border-b",
  bottom: "inset-x-0 bottom-0 w-full border-t",
};

export interface SheetContentProps
  extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> {
  side?: SheetSide;
}

export const SheetContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  SheetContentProps
>(({ side = "end", className, children, ...props }, ref) => (
  <DialogPrimitive.Portal>
    <DialogPrimitive.Overlay
      className={cn(
        "fixed inset-0 z-50 bg-background/80 backdrop-blur-sm",
        "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      )}
    />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed z-50 gap-4 bg-background p-6 shadow-lg",
        "transition ease-in-out data-[state=open]:animate-in data-[state=closed]:animate-out",
        sideClassMap[side],
        className,
      )}
      {...props}
    >
      {children}
      <DialogPrimitive.Close
        aria-label="Close panel"
        className="absolute top-4 end-4 rounded-sm opacity-70 hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
      >
        <X className="h-4 w-4" />
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPrimitive.Portal>
));
SheetContent.displayName = "SheetContent";
