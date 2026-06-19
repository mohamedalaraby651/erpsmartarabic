/**
 * Canonical Spinner — indeterminate progress indicator.
 *
 * @canonicalState Canonical
 * @adr ADR-0003
 * @since UX-1C
 */
import * as React from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SpinnerProps extends React.HTMLAttributes<HTMLSpanElement> {
  size?: "sm" | "md" | "lg";
  /** Accessible label, defaults to "Loading". */
  label?: string;
}

const sizeMap = { sm: "h-4 w-4", md: "h-5 w-5", lg: "h-6 w-6" } as const;

export function Spinner({
  className,
  size = "md",
  label = "Loading",
  ...props
}: SpinnerProps) {
  return (
    <span
      role="status"
      aria-live="polite"
      className={cn("inline-flex items-center justify-center", className)}
      {...props}
    >
      <Loader2
        className={cn(
          "animate-spin motion-reduce:animate-none text-current",
          sizeMap[size],
        )}
        aria-hidden="true"
      />
      <span className="sr-only">{label}</span>
    </span>
  );
}
