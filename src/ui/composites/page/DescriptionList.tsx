/**
 * DescriptionList — UX-1D.
 *
 * @canonicalState Canonical
 * @adr ADR-0004
 * @since UX-1D
 */
import * as React from "react";
import { cn } from "@/lib/utils";

export interface DescriptionListItem {
  term: React.ReactNode;
  description: React.ReactNode;
}

export interface DescriptionListProps
  extends Omit<React.HTMLAttributes<HTMLDListElement>, "children"> {
  items: ReadonlyArray<DescriptionListItem>;
}

export const DescriptionList = React.forwardRef<HTMLDListElement, DescriptionListProps>(
  ({ items, className, ...props }, ref) => (
    <dl
      ref={ref}
      className={cn(
        "grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-[max-content_1fr]",
        className,
      )}
      {...props}
    >
      {items.map((it, i) => (
        <React.Fragment key={i}>
          <dt className="text-sm font-medium text-muted-foreground">{it.term}</dt>
          <dd className="text-sm">{it.description}</dd>
        </React.Fragment>
      ))}
    </dl>
  ),
);
DescriptionList.displayName = "DescriptionList";
