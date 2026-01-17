import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface MobileListSkeletonProps {
  count?: number;
  className?: string;
}

export function MobileListSkeleton({ count = 5, className }: MobileListSkeletonProps) {
  return (
    <div className={cn('space-y-3', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className="animate-pulse">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              {/* Avatar skeleton */}
              <div className="h-12 w-12 rounded-full bg-muted shrink-0" />
              
              {/* Content skeleton */}
              <div className="flex-1 space-y-2">
                <div className="h-4 w-2/3 bg-muted rounded" />
                <div className="h-3 w-1/2 bg-muted rounded" />
              </div>
              
              {/* Badge skeleton */}
              <div className="h-6 w-16 bg-muted rounded-full" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

interface MobileCardSkeletonProps {
  className?: string;
}

export function MobileCardSkeleton({ className }: MobileCardSkeletonProps) {
  return (
    <Card className={cn('animate-pulse', className)}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {/* Avatar/Icon skeleton */}
          <div className="h-12 w-12 rounded-lg bg-muted shrink-0" />
          
          {/* Content skeleton */}
          <div className="flex-1 space-y-3">
            <div className="flex items-center justify-between">
              <div className="h-5 w-1/2 bg-muted rounded" />
              <div className="h-5 w-14 bg-muted rounded-full" />
            </div>
            <div className="h-3 w-3/4 bg-muted rounded" />
            <div className="flex gap-2">
              <div className="h-3 w-20 bg-muted rounded" />
              <div className="h-3 w-24 bg-muted rounded" />
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
    <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className="animate-pulse min-w-[130px] shrink-0">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div className="h-10 w-10 rounded-lg bg-muted" />
              <div className="space-y-1.5">
                <div className="h-5 w-12 bg-muted rounded" />
                <div className="h-3 w-16 bg-muted rounded" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
