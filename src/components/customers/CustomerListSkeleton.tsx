import { memo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

interface CustomerListSkeletonProps {
  count?: number;
}

export const CustomerListSkeleton = memo(function CustomerListSkeleton({ count = 8 }: CustomerListSkeletonProps) {
  return (
    <div className="space-y-1">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 px-3 py-3 rounded-lg border-s-[3px] border-s-transparent animate-fade-in"
          style={{ animationDelay: `${i * 50}ms` }}
        >
          <Skeleton className="h-10 w-10 rounded-full shrink-0" />
          <div className="flex-1 min-w-0 space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-20" />
          </div>
          <Skeleton className="h-4 w-16 hidden lg:block" />
          <Skeleton className="h-4 w-14 hidden xl:block" />
          <div className="w-24 space-y-1">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-2.5 w-8" />
          </div>
        </div>
      ))}
    </div>
  );
});
