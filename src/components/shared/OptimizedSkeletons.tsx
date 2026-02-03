import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { memo, forwardRef } from 'react';

interface OptimizedSkeletonProps {
  className?: string;
  count?: number;
  gap?: number;
}

/**
 * Optimized row skeleton for table views
 */
export const TableRowSkeleton = memo(forwardRef<HTMLDivElement, OptimizedSkeletonProps & { columns?: number }>(
  function TableRowSkeleton({ columns = 5, className }, ref) {
    return (
      <div ref={ref} className={cn('flex items-center gap-4 p-4 border-b', className)}>
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton 
            key={i} 
            className={cn(
              'h-4',
              i === 0 ? 'w-24' : i === columns - 1 ? 'w-16' : 'flex-1'
            )} 
          />
        ))}
      </div>
    );
  }
));

/**
 * Optimized card skeleton for mobile list views
 */
export const CardSkeleton = memo(forwardRef<HTMLDivElement, OptimizedSkeletonProps>(
  function CardSkeleton({ className }, ref) {
    return (
      <div ref={ref} className={cn('p-4 rounded-xl border bg-card', className)}>
        <div className="flex items-start gap-3">
          <Skeleton className="h-12 w-12 rounded-xl shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
            <Skeleton className="h-3 w-24" />
            <div className="flex gap-4 pt-1">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
          <Skeleton className="h-5 w-5 rounded shrink-0" />
        </div>
      </div>
    );
  }
));

/**
 * Grid skeleton for stats cards
 */
export const StatsGridSkeleton = memo(forwardRef<HTMLDivElement, OptimizedSkeletonProps & { columns?: 2 | 3 | 4 }>(
  function StatsGridSkeleton({ columns = 4, className }, ref) {
    const gridCols = columns === 2 ? 'grid-cols-2' : columns === 3 ? 'grid-cols-2 md:grid-cols-3' : 'grid-cols-2 md:grid-cols-4';
    
    return (
      <div ref={ref} className={cn('grid gap-4', gridCols, className)}>
        {Array.from({ length: columns }).map((_, i) => (
          <div key={i} className="p-4 rounded-xl border bg-card">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-lg" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-6 w-16" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }
));

/**
 * Optimized list skeleton with customizable count
 */
export const ListSkeleton = memo(forwardRef<HTMLDivElement, OptimizedSkeletonProps>(
  function ListSkeleton({ count = 5, gap = 12, className }, ref) {
    return (
      <div ref={ref} className={cn('space-y-3', className)} style={{ gap }}>
        {Array.from({ length: count }).map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
    );
  }
));
