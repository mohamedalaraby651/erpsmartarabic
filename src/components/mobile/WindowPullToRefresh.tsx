import { memo, useCallback, useEffect, useRef, useState } from "react";
import { Loader2, RefreshCw, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { haptics } from "@/lib/haptics";

interface WindowPullToRefreshProps {
  onRefresh: () => Promise<void> | void;
  /** عتبة المسافة لتفعيل التحديث (افتراضي 80px) */
  threshold?: number;
  /** أقصى مسافة سحب */
  maxPull?: number;
  /** تعطيل القابلية مؤقتاً */
  disabled?: boolean;
}

/**
 * Pull-to-refresh that listens to window touch events instead of a
 * dedicated scroll container. مناسب للصفحات التي تستخدم تمرير الـ window
 * (مثل صفحات داخل PageWrapper). يكتفي بحقن مؤشّر مرئي ولا يلفّ المحتوى.
 */
export const WindowPullToRefresh = memo(function WindowPullToRefresh({
  onRefresh, threshold = 80, maxPull = 120, disabled,
}: WindowPullToRefreshProps) {
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [done, setDone] = useState(false);
  const startY = useRef<number | null>(null);
  const triggeredHaptic = useRef(false);

  const handleStart = useCallback((e: TouchEvent) => {
    if (disabled || refreshing) return;
    if (window.scrollY > 2) return;
    startY.current = e.touches[0].clientY;
    triggeredHaptic.current = false;
  }, [disabled, refreshing]);

  const handleMove = useCallback((e: TouchEvent) => {
    if (startY.current == null || disabled || refreshing) return;
    if (window.scrollY > 2) { startY.current = null; setPull(0); return; }
    const dy = e.touches[0].clientY - startY.current;
    if (dy <= 0) { setPull(0); return; }
    const distance = Math.min(dy * 0.5, maxPull);
    setPull(distance);
    if (distance >= threshold && !triggeredHaptic.current) {
      haptics.medium();
      triggeredHaptic.current = true;
    } else if (distance < threshold) {
      triggeredHaptic.current = false;
    }
  }, [disabled, refreshing, maxPull, threshold]);

  const handleEnd = useCallback(async () => {
    if (startY.current == null) return;
    const distance = pull;
    startY.current = null;
    if (distance >= threshold && !refreshing) {
      setRefreshing(true);
      setPull(threshold);
      try {
        await onRefresh();
        haptics.success();
        setDone(true);
        setTimeout(() => setDone(false), 900);
      } finally {
        setRefreshing(false);
        setPull(0);
      }
    } else {
      setPull(0);
    }
  }, [pull, threshold, refreshing, onRefresh]);

  useEffect(() => {
    window.addEventListener("touchstart", handleStart, { passive: true });
    window.addEventListener("touchmove", handleMove, { passive: true });
    window.addEventListener("touchend", handleEnd, { passive: true });
    window.addEventListener("touchcancel", handleEnd, { passive: true });
    return () => {
      window.removeEventListener("touchstart", handleStart);
      window.removeEventListener("touchmove", handleMove);
      window.removeEventListener("touchend", handleEnd);
      window.removeEventListener("touchcancel", handleEnd);
    };
  }, [handleStart, handleMove, handleEnd]);

  if (pull <= 0 && !refreshing && !done) return null;

  const opacity = Math.min(pull / threshold, 1);
  const rotation = (pull / threshold) * 360;
  const reached = pull >= threshold;

  return (
    <div
      className="fixed top-2 left-1/2 -translate-x-1/2 z-50 pointer-events-none flex items-center justify-center"
      style={{ opacity: refreshing || done ? 1 : opacity }}
      aria-live="polite"
    >
      <div className={cn(
        "flex items-center gap-2 px-3 h-10 rounded-full border bg-card/95 backdrop-blur shadow-lg",
        done && "text-success border-success/30",
      )}>
        {refreshing ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            <span className="text-xs font-medium">جاري التحديث…</span>
          </>
        ) : done ? (
          <>
            <Check className="h-4 w-4" />
            <span className="text-xs font-medium">تم التحديث</span>
          </>
        ) : (
          <>
            <RefreshCw
              className={cn("h-4 w-4 transition-colors", reached ? "text-primary" : "text-muted-foreground")}
              style={{ transform: `rotate(${rotation}deg)` }}
            />
            <span className={cn("text-xs font-medium", reached ? "text-primary" : "text-muted-foreground")}>
              {reached ? "أفلت للتحديث" : "اسحب للتحديث"}
            </span>
          </>
        )}
      </div>
    </div>
  );
});
