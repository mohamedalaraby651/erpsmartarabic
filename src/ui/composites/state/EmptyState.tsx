/**
 * EmptyState — UX-1D.
 *
 * @canonicalState Canonical
 * @adr ADR-0004
 * @since UX-1D
 *
 * Presentational empty/zero-data slot. No domain awareness.
 */
import * as React from "react";
import { cn } from "@/lib/utils";

export interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
}

export const EmptyState = React.forwardRef<HTMLDivElement, EmptyStateProps>(
  ({ title, description, icon, action, className, ...props }, ref) => (
    <div
      ref={ref}
      role="status"
      aria-live="polite"
      className={cn(
        "flex flex-col items-center justify-center gap-3 p-8 text-center",
        className,
      )}
      {...props}
    >
      {icon ? (
        <div aria-hidden className="text-muted-foreground">
          {icon}
        </div>
      ) : null}
      <h3 className="text-base font-semibold">{title}</h3>
      {description ? (
        <p className="text-sm text-muted-foreground">{description}</p>
      ) : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  ),
);
EmptyState.displayName = "EmptyState";
