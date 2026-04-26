import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface MobileListSkeletonProps {
  count?: number;
  className?: string;
  variant?: 'default' | 'invoice' | 'order' | 'employee' | 'product';
}

/**
 * Premium mobile list skeleton.
 * Mirrors the actual DataCard layout (icon + title + status chip + meta fields)
 * so the perceived loading transition feels instant and polished.
 */
export function MobileListSkeleton({ count = 5, className, variant = 'default' }: MobileListSkeletonProps) {
  return (
    <div className={cn('space-y-3', className)} role="status" aria-label="جارٍ تحميل البيانات">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className="overflow-hidden border-border/60 shadow-xs">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              {/* Avatar / Icon */}
              <Skeleton className="h-11 w-11 rounded-xl shrink-0" />

              {/* Content */}
              <div className="flex-1 min-w-0 space-y-2.5">
                {/* Title row + status chip */}
                <div className="flex items-center justify-between gap-2">
                  <Skeleton className="h-4 w-2/3 rounded-md" />
                  <Skeleton className="h-5 w-14 rounded-full shrink-0" />
                </div>

                {/* Subtitle */}
                <Skeleton className="h-3 w-1/2 rounded-md" />

                {/* Field rows — separated to mirror real DataCard */}
                <div className="pt-2 space-y-2 border-t border-border/40">
                  {(variant === 'invoice' || variant === 'order') ? (
                    <>
                      <div className="flex items-center justify-between gap-2">
                        <Skeleton className="h-3 w-16 rounded-sm" />
                        <Skeleton className="h-3 w-20 rounded-sm" />
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <Skeleton className="h-3 w-14 rounded-sm" />
                        <Skeleton className="h-3 w-24 rounded-sm" />
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <Skeleton className="h-3 w-12 rounded-sm" />
                        <Skeleton className="h-4 w-20 rounded-sm" />
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center justify-between gap-2">
                        <Skeleton className="h-3 w-16 rounded-sm" />
                        <Skeleton className="h-3 w-24 rounded-sm" />
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <Skeleton className="h-3 w-20 rounded-sm" />
                        <Skeleton className="h-3 w-16 rounded-sm" />
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
      <span className="sr-only">جارٍ التحميل...</span>
    </div>
  );
}

interface MobileCardSkeletonProps {
  className?: string;
}

export function MobileCardSkeleton({ className }: MobileCardSkeletonProps) {
  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {/* Avatar/Icon skeleton */}
          <Skeleton className="h-12 w-12 rounded-lg shrink-0" />
          
          {/* Content skeleton */}
          <div className="flex-1 space-y-3">
            <div className="flex items-center justify-between">
              <Skeleton className="h-5 w-1/2" />
              <Skeleton className="h-5 w-14 rounded-full" />
            </div>
            <Skeleton className="h-3 w-3/4" />
            <div className="flex gap-2">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface MobileStatSkeletonProps {
  count?: number;
}

export function MobileStatSkeleton({ count = 4 }: MobileStatSkeletonProps) {
  return (
    <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className="min-w-[140px] shrink-0">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Skeleton className="h-10 w-10 rounded-lg" />
              <div className="space-y-1.5">
                <Skeleton className="h-5 w-12" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// Detail page skeleton
export function MobileDetailSkeleton() {
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Skeleton className="h-16 w-16 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-24" />
        </div>
      </div>
      
      {/* Stats */}
      <MobileStatSkeleton count={3} />
      
      {/* Content cards */}
      <Card>
        <CardContent className="p-4 space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex justify-between">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-32" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
