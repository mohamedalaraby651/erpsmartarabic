/**
 * Stat & StatGrid — UX-1D.
 *
 * @canonicalState Canonical
 * @adr ADR-0004
 * @since UX-1D
 *
 * Presentational KPI tiles. No domain calculation; consumers pass formatted
 * values.
 */
import * as React from "react";
import { Card, CardContent } from "@/ui/primitives/Card";
import { cn } from "@/lib/utils";

export interface StatProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  trend?: "up" | "down" | "flat";
}

export const Stat = React.forwardRef<HTMLDivElement, StatProps>(
  ({ label, value, hint, trend, className, ...props }, ref) => (
    <Card
      ref={ref}
      data-trend={trend}
      className={cn("h-full", className)}
      {...props}
    >
      <CardContent className="flex flex-col gap-1 p-4 pt-4">
        <span className="text-xs font-medium uppercase text-muted-foreground">
          {label}
        </span>
        <span className="text-2xl font-semibold tabular-nums">{value}</span>
        {hint ? <span className="text-xs text-muted-foreground">{hint}</span> : null}
      </CardContent>
    </Card>
  ),
);
Stat.displayName = "Stat";

export interface StatGridProps extends React.HTMLAttributes<HTMLDivElement> {
  columns?: 2 | 3 | 4;
}

export const StatGrid = React.forwardRef<HTMLDivElement, StatGridProps>(
  ({ columns = 4, className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "grid gap-3",
        columns === 2 && "grid-cols-1 sm:grid-cols-2",
        columns === 3 && "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
        columns === 4 && "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
        className,
      )}
      {...props}
    />
  ),
);
StatGrid.displayName = "StatGrid";
