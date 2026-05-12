import { memo, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { PRIMARY_STRIP_IDS, type MobileSectionId } from "./CustomerIconStrip";

interface CustomerSwipeHintProps {
  /** القسم النشط حالياً — لإظهار النقطة الموافقة */
  signal: MobileSectionId;
  storageKey?: string;
  /** أظهر دائماً نقاط الموضع حتى لو رأى المستخدم التلميح من قبل */
  alwaysShowDots?: boolean;
}

/**
 * تلميح بصري للسحب يمين/يسار + نقاط موضع للقسم الحالي ضمن الأقسام الأساسية.
 * النقاط دائمة — التلميح النصي يختفي بعد أول مرة.
 */
export const CustomerSwipeHint = memo(function CustomerSwipeHint({
  signal,
  storageKey = "customer-swipe-hint-seen",
  alwaysShowDots = true,
}: CustomerSwipeHintProps) {
  const [showText, setShowText] = useState(false);

  useEffect(() => {
    try {
      if (typeof window === "undefined") return;
      if (window.localStorage.getItem(storageKey) === "1") return;
      setShowText(true);
      const t = setTimeout(() => {
        setShowText(false);
        try { window.localStorage.setItem(storageKey, "1"); } catch { /* ignore */ }
      }, 2500);
      return () => clearTimeout(t);
    } catch { /* ignore */ }
  }, [storageKey]);

  const idx = (PRIMARY_STRIP_IDS as readonly string[]).indexOf(signal);
  const isPrimary = idx !== -1;

  if (!showText && !(alwaysShowDots && isPrimary)) return null;

  return (
    <div className="flex items-center justify-center gap-2 mb-1.5 select-none" aria-hidden>
      {showText && (
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground animate-fade-in">
          <ChevronRight className="h-3 w-3 animate-pulse" />
          <span>اسحب للتنقل</span>
          <ChevronLeft className="h-3 w-3 animate-pulse" />
        </div>
      )}
      {alwaysShowDots && isPrimary && (
        <div className="flex items-center gap-1" role="tablist" aria-label="موضع القسم">
          {PRIMARY_STRIP_IDS.map((_, i) => (
            <span
              key={i}
              className={cn(
                "h-1 rounded-full transition-all",
                i === idx ? "w-4 bg-primary" : "w-1 bg-muted-foreground/30",
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
});
