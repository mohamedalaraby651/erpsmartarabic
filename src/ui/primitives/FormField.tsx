/**
 * Canonical FormField — composition wrapper: Label + control + help + error.
 *
 * @canonicalState Canonical
 * @adr ADR-0003
 * @since UX-1C
 *
 * Renders a label, an input slot (via `children` receiving aria ids),
 * optional help text, and an inline error.
 */
import * as React from "react";
import { useId } from "react";
import { cn } from "@/lib/utils";
import { Label } from "./Label";

export interface FormFieldProps {
  label: React.ReactNode;
  help?: React.ReactNode;
  error?: React.ReactNode;
  required?: boolean;
  className?: string;
  children: (ids: {
    inputId: string;
    helpId?: string;
    errorId?: string;
    invalid: boolean;
  }) => React.ReactNode;
}

export function FormField({
  label,
  help,
  error,
  required,
  className,
  children,
}: FormFieldProps) {
  const inputId = useId();
  const helpId = help ? `${inputId}-help` : undefined;
  const errorId = error ? `${inputId}-error` : undefined;
  const invalid = !!error;

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <Label htmlFor={inputId} required={required}>
        {label}
      </Label>
      {children({ inputId, helpId, errorId, invalid })}
      {help && !error ? (
        <p id={helpId} className="text-xs text-muted-foreground">
          {help}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} role="alert" className="text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
