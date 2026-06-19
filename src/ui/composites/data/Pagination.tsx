/**
 * Pagination — UX-1D.
 *
 * @canonicalState Canonical
 * @adr ADR-0004
 * @since UX-1D
 *
 * Presentational only. Emits `grid.page.change` via CompositeEvent envelope.
 * Does NOT fetch, does NOT infer totals, does NOT decide strategy.
 */
import * as React from "react";
import { Button } from "@/ui";
import type { CompositeEventHandler, GridUIEvent } from "@/ui/contracts";
import { cn } from "@/lib/utils";

export interface PaginationProps extends React.HTMLAttributes<HTMLElement> {
  page: number;
  pageCount: number;
  onEvent?: CompositeEventHandler<GridUIEvent>;
}

export const Pagination = React.forwardRef<HTMLElement, PaginationProps>(
  ({ page, pageCount, onEvent, className, ...props }, ref) => {
    const go = (next: number) => {
      if (next < 1 || next > pageCount || next === page) return;
      onEvent?.({ type: "grid.page.change", payload: { page: next } });
    };
    return (
      <nav
        ref={ref}
        aria-label="Pagination"
        className={cn("flex items-center justify-end gap-2", className)}
        {...props}
      >
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => go(page - 1)}
        >
          Previous
        </Button>
        <span className="text-sm text-muted-foreground" aria-live="polite">
          Page {page} of {pageCount}
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={page >= pageCount}
          onClick={() => go(page + 1)}
        >
          Next
        </Button>
      </nav>
    );
  },
);
Pagination.displayName = "Pagination";
