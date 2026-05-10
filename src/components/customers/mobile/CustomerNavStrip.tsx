import { memo } from "react";
import { ChevronRight, ChevronLeft, Users } from "lucide-react";
import { cn } from "@/lib/utils";

interface CustomerNavStripProps {
  hasPrev: boolean;
  hasNext: boolean;
  onPrev: () => void;
  onNext: () => void;
  positionLabel?: string;
}

/**
 * Mobile-only previous/next customer navigation strip.
 * RTL: ChevronRight = previous (visually to the right), ChevronLeft = next.
 */
export const CustomerNavStrip = memo(function CustomerNavStrip({
  hasPrev, hasNext, onPrev, onNext, positionLabel,
}: CustomerNavStripProps) {
  if (!hasPrev && !hasNext) return null;
  return (
    <div className="flex items-center justify-between bg-card/60 backdrop-blur border rounded-lg px-2 py-1.5 text-xs">
      <button
        type="button"
        onClick={onPrev}
        disabled={!hasPrev}
        aria-label="العميل السابق"
        className={cn(
          "inline-flex items-center gap-1 px-2 h-9 min-h-9 rounded-md font-medium transition-colors",
          hasPrev ? "text-foreground hover:bg-muted active:scale-95" : "text-muted-foreground/40",
        )}
      >
        <ChevronRight className="h-4 w-4" />
        السابق
      </button>
      <span className="inline-flex items-center gap-1 text-muted-foreground">
        <Users className="h-3 w-3" />
        {positionLabel || "تصفح العملاء"}
      </span>
      <button
        type="button"
        onClick={onNext}
        disabled={!hasNext}
        aria-label="العميل التالي"
        className={cn(
          "inline-flex items-center gap-1 px-2 h-9 min-h-9 rounded-md font-medium transition-colors",
          hasNext ? "text-foreground hover:bg-muted active:scale-95" : "text-muted-foreground/40",
        )}
      >
        التالي
        <ChevronLeft className="h-4 w-4" />
      </button>
    </div>
  );
});
