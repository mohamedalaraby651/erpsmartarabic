import { memo } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface CustomerErrorStateProps {
  /** Presentation only — message already produced by the query layer. */
  message?: string;
  onRetry: () => void;
  isRetrying?: boolean;
}

/**
 * Explicit failure state for the customers list.
 * Presentation only: no data access, no business logic, no retry policy of its own.
 */
export const CustomerErrorState = memo(function CustomerErrorState({
  message,
  onRetry,
  isRetrying,
}: CustomerErrorStateProps) {
  return (
    <Card role="alert" className="border-destructive/40">
      <CardContent className="py-10 flex flex-col items-center text-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
          <AlertTriangle className="h-6 w-6 text-destructive" aria-hidden />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-semibold text-foreground">تعذّر تحميل قائمة العملاء</p>
          <p className="text-xs text-muted-foreground max-w-sm">
            {message || "حدث خطأ أثناء جلب البيانات. تحقق من الاتصال ثم أعد المحاولة."}
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={onRetry} disabled={isRetrying} className="min-h-[44px] sm:min-h-0">
          <RefreshCw className={`h-3.5 w-3.5 ml-1 ${isRetrying ? "animate-spin" : ""}`} aria-hidden />
          إعادة المحاولة
        </Button>
      </CardContent>
    </Card>
  );
});
