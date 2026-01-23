/**
 * DetailPageSkeleton - Skeleton loader for detail pages (Customer, Invoice, Product, etc.)
 * 
 * Props:
 * - variant: 'default' | 'invoice' | 'customer' | 'product' | 'order' - Layout variant
 * - showTabs: boolean - Whether to show tab skeleton
 * - showHeader: boolean - Whether to show header with back button
 * - tabCount: number - Number of tabs to show
 */

import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { useIsMobile } from '@/hooks/use-mobile';

interface DetailPageSkeletonProps {
  variant?: 'default' | 'invoice' | 'customer' | 'product' | 'order';
  showTabs?: boolean;
  showHeader?: boolean;
  tabCount?: number;
}

export function DetailPageSkeleton({
  variant = 'default',
  showTabs = true,
  showHeader = true,
  tabCount = 4,
}: DetailPageSkeletonProps) {
  const isMobile = useIsMobile();

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header with back button */}
      {showHeader && (
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-3">
              <Skeleton className="h-7 w-48" />
              <Skeleton className="h-6 w-16 rounded-full" />
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
            <Skeleton className="h-4 w-32" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-9 w-9 rounded-lg" />
            <Skeleton className="h-9 w-9 rounded-lg" />
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className={`grid gap-4 ${isMobile ? 'grid-cols-2' : 'grid-cols-4'}`}>
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-lg" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-6 w-16" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      {showTabs && (
        <div className="space-y-4">
          <div className={`flex gap-2 ${isMobile ? 'overflow-x-auto pb-2' : ''}`}>
            {Array.from({ length: tabCount }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-24 rounded-lg shrink-0" />
            ))}
          </div>

          {/* Tab Content */}
          <Card>
            <CardHeader className="pb-2">
              <Skeleton className="h-5 w-32" />
            </CardHeader>
            <CardContent className="space-y-4">
              {variant === 'invoice' || variant === 'order' ? (
                // Table-like content for invoices/orders
                <>
                  <div className="space-y-3">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="flex items-center justify-between py-2 border-b last:border-0">
                        <div className="flex items-center gap-3">
                          <Skeleton className="h-10 w-10 rounded-lg" />
                          <div className="space-y-1">
                            <Skeleton className="h-4 w-32" />
                            <Skeleton className="h-3 w-20" />
                          </div>
                        </div>
                        <div className="text-left space-y-1">
                          <Skeleton className="h-4 w-16" />
                          <Skeleton className="h-3 w-12" />
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between pt-4 border-t">
                    <Skeleton className="h-5 w-20" />
                    <Skeleton className="h-6 w-28" />
                  </div>
                </>
              ) : (
                // Info rows for customer/product details
                <div className="grid gap-4 md:grid-cols-2">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="flex justify-between items-center py-2 border-b">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-4 w-32" />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

// Compact version for embedded detail sections
export function CompactDetailSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-3 animate-pulse">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex justify-between items-center py-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-32" />
        </div>
      ))}
    </div>
  );
}
