import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, RefreshCw, Home, WifiOff, Bug, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePageTitle } from '@/hooks/usePageTitle';
import { emitTelemetry, getBufferedEvents } from '@/lib/runtimeTelemetry';

export interface RouteErrorPageProps {
  /** The error captured by the boundary, if any. */
  error?: Error | null;
  /** Stack of failing component tree (from React ErrorInfo). */
  componentStack?: string | null;
  /** Optional callback for the in-place "Retry" button (resets the boundary). */
  onRetry?: () => void;
  /**
   * Variant tweaks the headline/copy:
   * - 'crash'   → JS error caught by boundary
   * - 'chunk'   → dynamic import / chunk failure (post-deploy)
   * - 'offline' → user has no network
   * - 'unknown' → generic fallback
   */
  variant?: 'crash' | 'chunk' | 'offline' | 'unknown';
}

/**
 * Unified, branded error screen rendered instead of a white screen whenever:
 *   - AppErrorBoundary / PageErrorBoundary catches a React render error
 *   - A lazy-loaded route chunk fails after retries
 *   - The browser is offline and a navigation depends on the network
 *
 * Design goals:
 *   - Always actionable: shows a Retry CTA + Home link, never a dead end
 *   - Self-explanatory: uses semantic Arabic copy, no developer jargon
 *   - Diagnosable: emits a telemetry event on mount and exposes a one-click
 *     "copy diagnostic code" so support can correlate with backend logs
 *   - Themed: uses semantic tokens only (no raw colors), respects RTL
 */
export default function RouteErrorPage({
  error,
  componentStack,
  onRetry,
  variant = 'crash',
}: RouteErrorPageProps) {
  usePageTitle('حدث خطأ');
  const [copied, setCopied] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  // Generate a short diagnostic code the user can read out to support.
  // Stable for the lifetime of this mount so they see the same code on screen.
  const diagCode = useMemo(
    () => `ERR-${Date.now().toString(36).toUpperCase().slice(-6)}`,
    [],
  );

  // Emit a single telemetry event so we know this screen was actually shown
  // (separate from the underlying error event, which may have been emitted
  // earlier by a global handler or boundary).
  useEffect(() => {
    emitTelemetry('react_error_boundary', error?.message || `route_error:${variant}`, {
      errorName: error?.name,
      errorStack: error?.stack,
      componentStack: componentStack ?? undefined,
      metadata: { surface: 'RouteErrorPage', variant, diagCode },
    });
  }, [error, componentStack, variant, diagCode]);

  const headline = (() => {
    switch (variant) {
      case 'chunk':   return 'تعذّر تحميل هذا القسم';
      case 'offline': return 'لا يوجد اتصال بالإنترنت';
      case 'unknown': return 'حدث خطأ غير متوقع';
      case 'crash':
      default:        return 'حدث خطأ أثناء عرض الصفحة';
    }
  })();

  const subline = (() => {
    switch (variant) {
      case 'chunk':
        return 'قد يكون هذا بسبب تحديث جديد للنظام. اضغط "إعادة المحاولة" لتحميل أحدث نسخة.';
      case 'offline':
        return 'تأكد من اتصالك بالإنترنت ثم أعد المحاولة. لن تفقد أي بيانات.';
      default:
        return 'نعتذر عن الإزعاج. يمكنك إعادة المحاولة أو العودة للصفحة الرئيسية. تم تسجيل تفاصيل الخطأ تلقائياً.';
    }
  })();

  const Icon = variant === 'offline' ? WifiOff : AlertTriangle;

  const handleRetry = () => {
    if (onRetry) {
      onRetry();
      return;
    }
    // Hard reload — gets fresh HTML + clears any stuck chunk references
    window.location.reload();
  };

  const handleCopyDiag = async () => {
    try {
      const recent = getBufferedEvents().slice(-5);
      const blob = [
        `Diagnostic: ${diagCode}`,
        `Time: ${new Date().toISOString()}`,
        `URL: ${window.location.href}`,
        `Variant: ${variant}`,
        `Error: ${error?.name || ''}: ${error?.message || ''}`,
        '',
        'Recent events:',
        JSON.stringify(recent, null, 2),
      ].join('\n');
      await navigator.clipboard.writeText(blob);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore */ }
  };

  return (
    <div
      className="min-h-[60vh] w-full flex items-center justify-center p-4"
      dir="rtl"
      role="alert"
      aria-live="assertive"
    >
      <div className="max-w-md w-full text-center">
        {/* Iconic header */}
        <div className="mx-auto mb-5 h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center">
          <Icon className="h-8 w-8 text-destructive" />
        </div>

        <h1 className="text-2xl font-bold text-foreground mb-2">
          {headline}
        </h1>
        <p className="text-muted-foreground leading-relaxed mb-6">
          {subline}
        </p>

        {/* Primary actions */}
        <div className="flex flex-col sm:flex-row gap-2 justify-center mb-4">
          <Button onClick={handleRetry} size="lg" className="gap-2">
            <RefreshCw className="h-4 w-4" />
            إعادة المحاولة
          </Button>
          <Button asChild variant="outline" size="lg" className="gap-2">
            <a href="/">
              <Home className="h-4 w-4" />
              الرئيسية
            </a>
          </Button>
        </div>

        {/* Diagnostic chip — readable by user, copyable for support */}
        <div className="inline-flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-full px-3 py-1.5 mb-3">
          <span className="font-mono">{diagCode}</span>
          <button
            type="button"
            onClick={handleCopyDiag}
            className="hover:text-foreground transition-colors inline-flex items-center gap-1"
            aria-label="نسخ رمز التشخيص"
          >
            {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
            {copied ? 'تم النسخ' : 'نسخ'}
          </button>
        </div>

        {/* Dev-only details */}
        {import.meta.env.DEV && error && (
          <div className="mt-4 text-start">
            <button
              type="button"
              onClick={() => setShowDetails((v) => !v)}
              className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5"
            >
              <Bug className="h-3 w-3" />
              {showDetails ? 'إخفاء التفاصيل' : 'تفاصيل الخطأ (للمطور)'}
            </button>
            {showDetails && (
              <pre className="mt-2 p-3 bg-muted rounded-md text-xs font-mono text-destructive overflow-auto max-h-48 whitespace-pre-wrap">
                {error.toString()}
                {componentStack ? `\n\n${componentStack}` : ''}
              </pre>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
