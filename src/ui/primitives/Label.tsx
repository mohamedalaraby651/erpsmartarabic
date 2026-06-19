/**
 * Canonical Label — form label.
 *
 * @canonicalState Canonical
 * @adr ADR-0003
 * @since UX-1C
 *
 * `htmlFor` is required by type — encourages explicit association.
 */
import * as React from "react";
import { cn } from "@/lib/utils";

export interface LabelProps extends React.ComponentPropsWithoutRef<"label"> {
  htmlFor: string;
  required?: boolean;
}

export const Label = React.forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, children, required, ...props }, ref) => (
    <label
      ref={ref}
      className={cn(
        "text-sm font-medium text-foreground leading-none",
        "peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
        className,
      )}
      {...props}
    >
      {children}
      {required ? (
        <span aria-hidden="true" className="ms-1 text-destructive">
          *
        </span>
      ) : null}
    </label>
  ),
);
Label.displayName = "Label";
