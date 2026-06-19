/**
 * ErrorState — UX-1D.
 *
 * @canonicalState Canonical
 * @adr ADR-0004
 * @since UX-1D
 */
import * as React from "react";
import { cn } from "@/lib/utils";

export interface ErrorStateProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export const ErrorState = React.forwardRef<HTMLDivElement, ErrorStateProps>(
  ({ title, description, action, className, ...props }, ref) => (
    <div
      ref={ref}
      role="alert"
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-md border border-destructive/40 bg-destructive/5 p-8 text-center",
        className,
      )}
      {...props}
    >
      <h3 className="text-base font-semibold text-destructive">{title}</h3>
      {description ? (
        <p className="text-sm text-muted-foreground">{description}</p>
      ) : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  ),
);
ErrorState.displayName = "ErrorState";
