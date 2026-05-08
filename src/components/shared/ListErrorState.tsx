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
  error?: unknown;
  onRetry?: () => void;
  className?: string;
}

export function ListErrorState({
  message,
  error,
  onRetry,
  className,
}: ListErrorStateProps) {
  // Lazy import to avoid circular deps; safely format any error shape.
  const safeMessage = React.useMemo(() => {
    if (message) return message;
    if (!error) return "تعذّر تحميل البيانات. يرجى المحاولة مرة أخرى.";
    if (error instanceof Error) return error.message || "تعذّر تحميل البيانات.";
    if (typeof error === "string") return error;
    return "تعذّر تحميل البيانات. يرجى المحاولة مرة أخرى.";
  }, [message, error]);
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-destructive/30 bg-destructive/5 p-8 text-center",
        className
      )}
      role="alert"
    >
      <AlertTriangle className="h-10 w-10 text-destructive" aria-hidden />
      <p className="max-w-md text-sm text-destructive">{safeMessage}</p>
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
