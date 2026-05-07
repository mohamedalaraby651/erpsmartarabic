import { memo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/card';

interface CustomerMobileSkeletonProps {
  count?: number;
  showSummary?: boolean;
  showSortBar?: boolean;
}

/**
 * Skeleton مخصص لبطاقات العملاء على الموبايل،
 * يطابق هيكل CustomerListCard ليمنع أي قفزات تخطيط (CLS).
 */
export const CustomerMobileSkeleton = memo(function CustomerMobileSkeleton({
  count = 6,
  showSummary = true,
  showSortBar = true,
}: CustomerMobileSkeletonProps) {
  return (
    <div role="status" aria-live="polite" aria-label="جارٍ تحميل قائمة العملاء">
      <span className="sr-only">جارٍ تحميل العملاء…</span>

      {showSummary && (
        <Card className="p-3.5 mb-3 bg-card/60">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-6 w-28" />
            </div>
            <Skeleton className="h-9 w-9 rounded-xl" />
          </div>
          <div className="flex gap-2 mt-3">
            <Skeleton className="h-7 w-20 rounded-full" />
            <Skeleton className="h-7 w-24 rounded-full" />
            <Skeleton className="h-7 w-16 rounded-full" />
          </div>
        </Card>
      )}

      {showSortBar && (
        <div className="flex items-center justify-between mb-3">
          <Skeleton className="h-9 w-32 rounded-xl" />
          <Skeleton className="h-3 w-16" />
        </div>
      )}

      <div className="space-y-2.5">
        {Array.from({ length: count }).map((_, i) => (
          <Card
            key={i}
            className="p-3.5 border-s-[3px] border-s-border animate-pulse"
            style={{ animationDelay: `${Math.min(i, 6) * 80}ms` }}
          >
            <div className="flex items-start gap-3">
              <Skeleton className="h-11 w-11 rounded-xl shrink-0" />
              <div className="flex-1 min-w-0 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-16" />
                </div>
                <div className="flex items-center gap-1.5">
                  <Skeleton className="h-3 w-14" />
                  <Skeleton className="h-3 w-12" />
                </div>
                <div className="flex items-center gap-3">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            </div>
            {/* شريط الائتمان */}
            <div className="mt-3 space-y-1.5">
              <div className="flex justify-between">
                <Skeleton className="h-2.5 w-20" />
                <Skeleton className="h-2.5 w-24" />
              </div>
              <Skeleton className="h-1.5 w-full rounded-full" />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
});
