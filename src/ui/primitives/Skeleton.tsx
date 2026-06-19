/**
 * Canonical Skeleton — loading placeholder.
 *
 * @canonicalState Canonical
 * @adr ADR-0003
 * @since UX-1C
 *
 * Honors `prefers-reduced-motion` via Tailwind's `motion-reduce:` variant.
 */
import * as React from "react";
import { cn } from "@/lib/utils";

export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-live="polite"
      className={cn(
        "animate-pulse motion-reduce:animate-none rounded-md bg-muted",
        className,
      )}
      {...props}
    />
  );
}
