import { memo } from 'react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

interface PageLoadingStateProps {
  /** Layout variant */
  variant?: 'default' | 'table' | 'cards' | 'details';
  className?: string;
}

/** Shimmer-based loading skeleton for page-level loading states */
function PageLoadingStateInner({ variant = 'default', className }: PageLoadingStateProps) {
  if (variant === 'table') {
    return (
      <div className={cn('space-y-4', className)} dir="rtl">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-9 w-28 rounded-md" />
        </div>
        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-20 rounded-lg" />
          ))}
        </div>
        {/* Search + filters */}
        <div className="flex gap-2">
          <Skeleton className="h-10 flex-1 rounded-md" />
          <Skeleton className="h-10 w-24 rounded-md" />
        </div>
        {/* Table rows */}
        <div className="space-y-2">
          <Skeleton className="h-10 w-full rounded-md" />
          {[1, 2, 3, 4, 5].map(i => (
            <Skeleton key={i} className="h-14 w-full rounded-md" />
          ))}
        </div>
      </div>
    );
  }

  if (variant === 'cards') {
    return (
      <div className={cn('space-y-4', className)} dir="rtl">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-9 w-28 rounded-md" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Skeleton key={i} className="h-44 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (variant === 'details') {
    return (
      <div className={cn('space-y-6', className)} dir="rtl">
        {/* Back + title */}
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-9 rounded-md" />
          <Skeleton className="h-8 w-48" />
        </div>
        {/* Info cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-32 rounded-xl md:col-span-1" />
          <Skeleton className="h-32 rounded-xl md:col-span-2" />
        </div>
        {/* Content */}
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  // Default
  return (
    <div className={cn('space-y-4', className)} dir="rtl">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-9 w-28 rounded-md" />
      </div>
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map(i => (
          <Skeleton key={i} className="h-28 rounded-lg" />
        ))}
      </div>
      <Skeleton className="h-72 w-full rounded-xl" />
    </div>
  );
}

export const PageLoadingState = memo(PageLoadingStateInner);
export default PageLoadingState;
