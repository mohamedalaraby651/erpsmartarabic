/**
 * Canonical Textarea — multi-line text field.
 *
 * @canonicalState Canonical
 * @adr ADR-0003
 * @since UX-1C
 */
import * as React from "react";
import { cn } from "@/lib/utils";

export interface TextareaProps
  extends React.ComponentPropsWithoutRef<"textarea"> {
  invalid?: boolean;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, invalid, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        aria-invalid={invalid || props["aria-invalid"]}
        className={cn(
          "flex min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-base text-foreground",
          "ring-offset-background placeholder:text-muted-foreground",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          "disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          invalid && "border-destructive focus-visible:ring-destructive",
          className,
        )}
        {...props}
      />
    );
  },
);
Textarea.displayName = "Textarea";
