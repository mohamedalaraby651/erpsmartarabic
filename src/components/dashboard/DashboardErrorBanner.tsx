import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface DashboardErrorBannerProps {
  error: Error;
  onRetry: () => void;
  isRetrying?: boolean;
}

/**
 * Inline error banner shown when `get_dashboard_overview` fails.
 * Keeps the rest of the page interactive and offers a one-click retry
 * (instead of forcing a full page reload).
 */
export function DashboardErrorBanner({ error, onRetry, isRetrying }: DashboardErrorBannerProps) {
  return (
    <Alert variant="destructive" className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div className="flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
        <div>
          <AlertTitle>تعذّر تحميل بيانات لوحة التحكم</AlertTitle>
          <AlertDescription className="mt-1 text-sm opacity-90">
            {error.message || 'حدث خطأ غير متوقع أثناء جلب البيانات. تحقّق من الاتصال ثم أعد المحاولة.'}
          </AlertDescription>
        </div>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={onRetry}
        disabled={isRetrying}
        className="gap-2 self-start md:self-auto"
      >
        <RefreshCw className={`h-4 w-4 ${isRetrying ? 'animate-spin' : ''}`} />
        {isRetrying ? 'جارٍ المحاولة…' : 'إعادة المحاولة'}
      </Button>
    </Alert>
  );
}
