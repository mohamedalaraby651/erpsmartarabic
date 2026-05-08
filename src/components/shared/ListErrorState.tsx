import * as React from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * ListErrorState — unified error UI for list/page-level fetch failures.
 * Pairs with `getSafeErrorMessage(error)` to ensure the displayed message
 * never leaks raw DB or stack-trace details to end users.
 */
interface ListErrorStateProps {
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export function ListErrorState({
  message = "تعذّر تحميل البيانات. يرجى المحاولة مرة أخرى.",
  onRetry,
  className,
}: ListErrorStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-destructive/30 bg-destructive/5 p-8 text-center",
        className
      )}
      role="alert"
    >
      <AlertTriangle className="h-10 w-10 text-destructive" aria-hidden />
      <p className="max-w-md text-sm text-destructive">{message}</p>
      {onRetry && (
        <Button
          variant="outline"
          size="sm"
          onClick={onRetry}
          className="gap-2 min-h-9"
        >
          <RefreshCw className="h-4 w-4" />
          إعادة المحاولة
        </Button>
      )}
    </div>
  );
}

export default ListErrorState;
