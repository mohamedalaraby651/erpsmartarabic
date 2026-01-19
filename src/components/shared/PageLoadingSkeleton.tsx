import { useIsMobile } from '@/hooks/use-mobile';
import { MobileListSkeleton, MobileStatSkeleton } from '@/components/mobile/MobileListSkeleton';
import { TableSkeleton } from '@/components/ui/table-skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface PageLoadingSkeletonProps {
  type?: 'list' | 'table' | 'cards' | 'detail';
  count?: number;
  showStats?: boolean;
  showSearch?: boolean;
  statsCount?: number;
  columns?: number;
}

export function PageLoadingSkeleton({
  type = 'list',
  count = 5,
  showStats = true,
  showSearch = true,
  statsCount = 4,
  columns = 6,
}: PageLoadingSkeletonProps) {
  const isMobile = useIsMobile();

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header Skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-7 w-32" />
          <Skeleton className="h-4 w-48" />
        </div>
        <Skeleton className="h-10 w-28" />
      </div>

      {/* Stats Skeleton */}
      {showStats && (
        isMobile ? (
          <MobileStatSkeleton count={statsCount} />
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: statsCount }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-lg" />
                    <div className="space-y-2">
                      <Skeleton className="h-6 w-12" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )
      )}

      {/* Search Skeleton */}
      {showSearch && (
        <Card>
          <CardContent className="p-4">
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      )}

      {/* Content Skeleton */}
      {isMobile ? (
        <MobileListSkeleton count={count} />
      ) : (
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-32" />
          </CardHeader>
          <CardContent>
            <TableSkeleton rows={count} columns={columns} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Stats-only skeleton for horizontal scroll on mobile
export function StatsLoadingSkeleton({ count = 4 }: { count?: number }) {
  const isMobile = useIsMobile();
  
  if (isMobile) {
    return <MobileStatSkeleton count={count} />;
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-lg" />
              <div className="space-y-2">
                <Skeleton className="h-6 w-12" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// List-only skeleton
export function ListLoadingSkeleton({ count = 5 }: { count?: number }) {
  const isMobile = useIsMobile();
  
  if (isMobile) {
    return <MobileListSkeleton count={count} />;
  }

  return <TableSkeleton rows={count} columns={6} />;
}
