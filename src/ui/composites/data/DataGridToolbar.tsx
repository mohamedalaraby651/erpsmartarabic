/**
 * DataGridToolbar — UX-1D.
 *
 * @canonicalState Canonical
 * @adr ADR-0004
 * @since UX-1D
 *
 * Slot-based toolbar above a DataGrid. Owns no state.
 */
import * as React from "react";
import { cn } from "@/lib/utils";

export interface DataGridToolbarProps extends React.HTMLAttributes<HTMLDivElement> {
  start?: React.ReactNode;
  end?: React.ReactNode;
}

export const DataGridToolbar = React.forwardRef<HTMLDivElement, DataGridToolbarProps>(
  ({ start, end, className, ...props }, ref) => (
    <div
      ref={ref}
      role="toolbar"
      className={cn(
        "flex flex-wrap items-center justify-between gap-2 pb-3",
        className,
      )}
      {...props}
    >
      <div className="flex items-center gap-2">{start}</div>
      <div className="flex items-center gap-2">{end}</div>
    </div>
  ),
);
DataGridToolbar.displayName = "DataGridToolbar";
