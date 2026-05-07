import { memo } from "react";

interface LiveRegionProps {
  message: string;
  /** polite (default) or assertive for urgent updates */
  politeness?: "polite" | "assertive";
}

/**
 * Visually-hidden ARIA live region for announcing UI changes
 * (sort order, filters applied, etc.) to screen readers.
 */
export const LiveRegion = memo(function LiveRegion({
  message,
  politeness = "polite",
}: LiveRegionProps) {
  return (
    <div
      role="status"
      aria-live={politeness}
      aria-atomic="true"
      className="sr-only"
    >
      {message}
    </div>
  );
});
