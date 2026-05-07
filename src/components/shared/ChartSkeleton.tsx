import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface ChartSkeletonProps {
  height?: number;
  variant?: "bars" | "line" | "donut";
  title?: boolean;
  className?: string;
}

/**
 * Elegant placeholder for charts before they enter the viewport.
 * Mimics chart structure (title + plot area + axis ticks) to prevent layout jumps.
 */
export function ChartSkeleton({
  height = 240,
  variant = "bars",
  title = true,
  className,
}: ChartSkeletonProps) {
  return (
    <Card className={cn("overflow-hidden", className)}>
      {title && (
        <CardHeader className="pb-2">
          <Skeleton className="h-4 w-40" />
        </CardHeader>
      )}
      <CardContent>
        <div className="relative w-full" style={{ height }}>
          {variant === "donut" ? (
            <div className="flex items-center justify-center h-full">
              <div className="relative">
                <Skeleton className="h-32 w-32 rounded-full" />
                <div className="absolute inset-6 rounded-full bg-card" />
              </div>
            </div>
          ) : variant === "line" ? (
            <div className="flex flex-col justify-end gap-2 h-full">
              <Skeleton className="h-px w-full opacity-50" />
              <Skeleton className="h-px w-full opacity-50" />
              <Skeleton className="h-px w-full opacity-50" />
              <div className="absolute inset-x-4 top-4 bottom-8">
                <Skeleton className="h-full w-full rounded-md opacity-60" />
              </div>
            </div>
          ) : (
            <div className="flex items-end justify-between gap-2 h-full pt-4 pb-2">
              {[60, 40, 80, 55, 70, 35, 90, 50].map((h, i) => (
                <Skeleton key={i} className="flex-1" style={{ height: `${h}%` }} />
              ))}
            </div>
          )}
        </div>
        <div className="flex justify-between mt-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-2 w-8" />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
