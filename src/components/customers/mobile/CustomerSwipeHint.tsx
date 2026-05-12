import { memo, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface CustomerSwipeHintProps {
  /** يتغير عند تغيّر القسم النشط لإعادة إظهار التلميح */
  signal: string;
  storageKey?: string;
}

/**
 * تلميح بصري للسحب يمين/يسار للتنقل بين الأقسام.
 * يظهر مرة واحدة لأول 3 ثوان عند فتح القسم، ثم يختفي نهائياً بعد أول مرة.
 */
export const CustomerSwipeHint = memo(function CustomerSwipeHint({
  signal,
  storageKey = "customer-swipe-hint-seen",
}: CustomerSwipeHintProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (typeof window === "undefined") return;
      if (window.localStorage.getItem(storageKey) === "1") return;
      setVisible(true);
      const t = setTimeout(() => {
        setVisible(false);
        try { window.localStorage.setItem(storageKey, "1"); } catch { /* ignore */ }
      }, 3000);
      return () => clearTimeout(t);
    } catch { /* ignore */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signal]);

  if (!visible) return null;

  return (
    <div
      className={cn(
        "flex items-center justify-center gap-2 text-[11px] text-muted-foreground mb-1.5 select-none",
        "animate-fade-in",
      )}
      aria-hidden
    >
      <ChevronRight className="h-3 w-3 animate-pulse" />
      <span>اسحب يميناً/يساراً للتنقل بين الأقسام</span>
      <ChevronLeft className="h-3 w-3 animate-pulse" />
    </div>
  );
});
