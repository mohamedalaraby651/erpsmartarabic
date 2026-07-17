/**
 * LoadingState — UX-1D.
 *
 * @canonicalState Canonical
 * @adr ADR-0004
 * @since UX-1D
 */
import * as React from "react";
import { Spinner } from "@/ui/primitives/Spinner";
import { cn } from "@/lib/utils";

export interface LoadingStateProps extends React.HTMLAttributes<HTMLDivElement> {
  label?: string;
}

export const LoadingState = React.forwardRef<HTMLDivElement, LoadingStateProps>(
  ({ label = "Loading…", className, ...props }, ref) => (
    <div
      ref={ref}
      role="status"
      aria-live="polite"
      aria-busy="true"
      className={cn("flex flex-col items-center justify-center gap-3 p-8", className)}
      {...props}
    >
      <Spinner />
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  ),
);
LoadingState.displayName = "LoadingState";
