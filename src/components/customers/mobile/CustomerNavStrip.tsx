import { memo, useEffect, useState } from "react";
import { ChevronRight, ChevronLeft, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { tooltips } from "@/lib/uiCopy";

interface CustomerNavStripProps {
  hasPrev: boolean;
  hasNext: boolean;
  onPrev: () => void;
  onNext: () => void;
  positionLabel?: string;
  /** يخفى تلقائياً عند التمرير لأسفل (افتراضي: true) */
  autoHide?: boolean;
}

/**
 * Mobile-only previous/next customer navigation strip.
 * RTL: ChevronRight = previous (visually to the right), ChevronLeft = next.
 */
export const CustomerNavStrip = memo(function CustomerNavStrip({
  hasPrev, hasNext, onPrev, onNext, positionLabel, autoHide = true,
}: CustomerNavStripProps) {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    if (!autoHide) return;
    let lastY = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      // أخفِ عند التمرير لأسفل بأكثر من 24px، وأظهره عند العودة للأعلى
      if (y > lastY + 8 && y > 80) setHidden(true);
      else if (y < lastY - 8 || y < 24) setHidden(false);
      lastY = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [autoHide]);

  if (!hasPrev && !hasNext) return null;
  return (
    <div
      className={cn(
        "flex items-center justify-between bg-card/60 backdrop-blur border rounded-lg px-2 py-1.5 text-xs",
        "transition-all duration-200 origin-top",
        hidden && "opacity-0 -translate-y-2 pointer-events-none h-0 py-0 overflow-hidden border-transparent",
      )}
      aria-hidden={hidden}
    >
      <button
        type="button"
        onClick={onPrev}
        disabled={!hasPrev}
        aria-label={tooltips.prevCustomer}
        className={cn(
          "inline-flex items-center gap-1 px-2 h-9 min-h-9 rounded-md font-medium transition-colors",
          hasPrev ? "text-foreground hover:bg-muted active:scale-95" : "text-muted-foreground/40",
        )}
      >
        <ChevronRight className="h-4 w-4" aria-hidden="true" />
        السابق
      </button>
      <span className="inline-flex items-center gap-1 text-muted-foreground">
        <Users className="h-3 w-3" aria-hidden="true" />
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
        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
});
