import { memo } from "react";
import { cn } from "@/lib/utils";

interface MobileListSkeletonProps {
  /** عدد البطاقات الوهمية */
  rows?: number;
  /** ارتفاع كل بطاقة */
  rowHeight?: number;
  /** إظهار شريط فلترة علوي */
  showFilter?: boolean;
  className?: string;
  ariaLabel?: string;
}

/**
 * Skeleton عام لقوائم الموبايل (فواتير/مدفوعات/تذكيرات).
 * يعرض بطاقات نبضية بنفس شكل البطاقات الفعلية.
 */
export const MobileListSkeleton = memo(function MobileListSkeleton({
  rows = 4,
  rowHeight = 88,
  showFilter = true,
  className,
  ariaLabel = "جارٍ تحميل البيانات",
}: MobileListSkeletonProps) {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-live="polite"
      aria-label={ariaLabel}
      className={cn("space-y-2.5", className)}
    >
      {showFilter && (
        <div className="flex items-center gap-2">
          <div className="h-9 flex-1 rounded-lg bg-muted animate-pulse" />
          <div className="h-9 w-20 rounded-lg bg-muted animate-pulse" />
        </div>
      )}
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="rounded-xl border bg-card p-3 animate-pulse"
          style={{ minHeight: rowHeight }}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 space-y-2">
              <div className="h-3.5 w-2/3 rounded bg-muted" />
              <div className="h-3 w-1/3 rounded bg-muted/70" />
            </div>
            <div className="space-y-1.5 items-end flex flex-col">
              <div className="h-4 w-20 rounded bg-muted" />
              <div className="h-3 w-12 rounded bg-muted/70" />
            </div>
          </div>
          <div className="mt-2.5 flex items-center gap-2">
            <div className="h-5 w-14 rounded-full bg-muted" />
            <div className="h-5 w-16 rounded-full bg-muted/70" />
          </div>
        </div>
      ))}
      <span className="sr-only">جارٍ تحميل البيانات…</span>
    </div>
  );
});
