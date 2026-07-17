/**
 * FormSection / FormRow / FormActions — UX-1D.
 *
 * @canonicalState Canonical
 * @adr ADR-0004
 * @since UX-1D
 */
import * as React from "react";
import { Separator } from "@/ui/primitives/Separator";
import { cn } from "@/lib/utils";

export interface FormSectionProps extends React.HTMLAttributes<HTMLElement> {
  title?: string;
  description?: string;
}

export const FormSection = React.forwardRef<HTMLElement, FormSectionProps>(
  ({ title, description, className, children, ...props }, ref) => (
    <section
      ref={ref}
      className={cn("flex flex-col gap-4", className)}
      {...props}
    >
      {title || description ? (
        <header className="flex flex-col gap-1">
          {title ? <h2 className="text-base font-semibold">{title}</h2> : null}
          {description ? (
            <p className="text-sm text-muted-foreground">{description}</p>
          ) : null}
          <Separator className="mt-2" />
        </header>
      ) : null}
      <div className="flex flex-col gap-4">{children}</div>
    </section>
  ),
);
FormSection.displayName = "FormSection";

export interface FormRowProps extends React.HTMLAttributes<HTMLDivElement> {
  columns?: 1 | 2 | 3;
}

export const FormRow = React.forwardRef<HTMLDivElement, FormRowProps>(
  ({ columns = 2, className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "grid gap-4",
        columns === 1 && "grid-cols-1",
        columns === 2 && "grid-cols-1 sm:grid-cols-2",
        columns === 3 && "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
        className,
      )}
      {...props}
    />
  ),
);
FormRow.displayName = "FormRow";

export const FormActions = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "flex flex-wrap items-center justify-end gap-2 border-t pt-4",
      className,
    )}
    {...props}
  />
));
FormActions.displayName = "FormActions";
