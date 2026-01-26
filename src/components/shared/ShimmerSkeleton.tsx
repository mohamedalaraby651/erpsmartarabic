import { cn } from '@/lib/utils';

interface ShimmerSkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular' | 'rounded';
  width?: string | number;
  height?: string | number;
  lines?: number;
}

export function ShimmerSkeleton({ 
  className,
  variant = 'rectangular',
  width,
  height,
  lines = 1,
}: ShimmerSkeletonProps) {
  const baseClasses = 'relative overflow-hidden bg-muted/60';
  
  const variantClasses = {
    text: 'rounded h-4',
    circular: 'rounded-full',
    rectangular: '',
    rounded: 'rounded-lg',
  };

  const shimmerClasses = 'before:absolute before:inset-0 before:-translate-x-full before:animate-shimmer before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent';

  const style = {
    width: width ? (typeof width === 'number' ? `${width}px` : width) : undefined,
    height: height ? (typeof height === 'number' ? `${height}px` : height) : undefined,
  };

  if (lines > 1) {
    return (
      <div className={cn('space-y-2', className)}>
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className={cn(
              baseClasses,
              variantClasses[variant],
              shimmerClasses,
              i === lines - 1 && 'w-3/4'
            )}
            style={{ ...style, width: i === lines - 1 ? '75%' : style.width }}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      className={cn(
        baseClasses,
        variantClasses[variant],
        shimmerClasses,
        className
      )}
      style={style}
    />
  );
}

// Card skeleton with shimmer
export function ShimmerCardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('p-4 rounded-xl border bg-card space-y-3', className)}>
      <div className="flex items-center gap-3">
        <ShimmerSkeleton variant="circular" width={48} height={48} />
        <div className="flex-1 space-y-2">
          <ShimmerSkeleton variant="text" className="w-3/4 h-4" />
          <ShimmerSkeleton variant="text" className="w-1/2 h-3" />
        </div>
      </div>
      <div className="flex gap-2">
        <ShimmerSkeleton variant="rounded" className="h-6 w-16" />
        <ShimmerSkeleton variant="rounded" className="h-6 w-20" />
      </div>
    </div>
  );
}

// List skeleton with shimmer
export function ShimmerListSkeleton({ 
  count = 5,
  className,
}: { 
  count?: number;
  className?: string;
}) {
  return (
    <div className={cn('space-y-3', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <ShimmerCardSkeleton key={i} />
      ))}
    </div>
  );
}

// Stats skeleton with shimmer
export function ShimmerStatsSkeleton({ 
  count = 4,
  className,
}: { 
  count?: number;
  className?: string;
}) {
  return (
    <div className={cn('flex gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div 
          key={i} 
          className="min-w-[130px] shrink-0 p-3 rounded-xl border bg-card space-y-2"
        >
          <div className="flex items-center gap-2">
            <ShimmerSkeleton variant="rounded" width={40} height={40} />
            <div className="space-y-1.5">
              <ShimmerSkeleton variant="text" className="w-12 h-5" />
              <ShimmerSkeleton variant="text" className="w-16 h-3" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// Detail page skeleton with shimmer
export function ShimmerDetailSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <div className="flex items-center gap-4">
        <ShimmerSkeleton variant="circular" width={64} height={64} />
        <div className="flex-1 space-y-2">
          <ShimmerSkeleton variant="text" className="w-32 h-5" />
          <ShimmerSkeleton variant="text" className="w-24 h-4" />
        </div>
      </div>
      
      {/* Stats */}
      <ShimmerStatsSkeleton count={3} />
      
      {/* Content cards */}
      <div className="p-4 rounded-xl border bg-card space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex justify-between">
            <ShimmerSkeleton variant="text" className="w-20 h-4" />
            <ShimmerSkeleton variant="text" className="w-32 h-4" />
          </div>
        ))}
      </div>
    </div>
  );
}
