import { Skeleton } from "@/components/ui/skeleton";

/** Route-level loading fallback (ported from the Classic App.tsx Suspense fallback). */
export function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-screen p-8">
      <div className="w-full max-w-md space-y-4">
        <Skeleton className="h-8 w-3/4 mx-auto" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-32 w-full" />
      </div>
    </div>
  );
}
