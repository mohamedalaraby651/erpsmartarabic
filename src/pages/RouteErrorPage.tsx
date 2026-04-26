import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, RefreshCw, Home, WifiOff, Wifi, Bug, Copy, Check, Loader2 } from 'lucide-react';
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

  // ── Network awareness ─────────────────────────────────────────────────────
  // Track navigator.onLine so the Retry button can wait for connectivity
  // instead of failing instantly when the user is offline.
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true,
  );
  // Retry phases: idle → checking (probing the network) → success/failure.
  const [retryPhase, setRetryPhase] = useState<'idle' | 'checking'>('idle');
  // True once the user has clicked Retry and we're queued waiting for the
  // browser's `online` event to fire — gives clear feedback they're not stuck.
  const [waitingForNetwork, setWaitingForNetwork] = useState(false);
  // Prevents stacking multiple in-flight probes if the user spam-clicks.
  const probeAbortRef = useRef<AbortController | null>(null);

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

  const Icon = waitingForNetwork || variant === 'offline' ? WifiOff : AlertTriangle;

  /**
   * Best-effort connectivity probe. We don't trust `navigator.onLine` alone
   * (it lies on captive portals + some VPNs), so we make a tiny HEAD-ish
   * request to a known-cheap, same-origin endpoint with a hard 4s timeout.
   * Returns true if the server is reachable.
   */
  const probeNetwork = useCallback(async (): Promise<boolean> => {
    try {
      probeAbortRef.current?.abort();
      const ctrl = new AbortController();
      probeAbortRef.current = ctrl;
      const timeout = setTimeout(() => ctrl.abort(), 4000);
      // Cache-bust to avoid SW serving a stale 200.
      const res = await fetch(`/favicon.ico?_probe=${Date.now()}`, {
        method: 'GET',
        cache: 'no-store',
        signal: ctrl.signal,
      });
      clearTimeout(timeout);
      return res.ok || res.status === 304;
    } catch {
      return false;
    }
  }, []);

  /**
   * Smart retry: check connectivity first, then either delegate to the
   * boundary's onRetry (in-place recovery, NO reload), or — only as a final
   * resort — fall back to a hard reload to fetch fresh chunks.
   */
  const handleRetry = useCallback(async () => {
    setRetryPhase('checking');
    const reachable = await probeNetwork();

    if (!reachable) {
      // Still offline: queue an automatic retry the moment the browser fires
      // the `online` event. The effect below handles the actual retry call.
      setRetryPhase('idle');
      setWaitingForNetwork(true);
      emitTelemetry('forced_reload', 'retry deferred — offline', {
        metadata: { source: 'RouteErrorPage', variant },
      });
      return;
    }

    setWaitingForNetwork(false);
    setRetryPhase('idle');

    // Prefer in-place recovery so we don't lose React state / scroll / forms.
    if (onRetry) {
      onRetry();
      return;
    }
    // Last resort for chunk failures with no boundary handler.
    window.location.reload();
  }, [onRetry, probeNetwork, variant]);

  /**
   * Auto-retry pipeline: when the browser regains connectivity AND the user
   * had previously asked to retry, fire the recovery automatically. Avoids
   * the user staring at the error screen wondering when to click again.
   */
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleOnline = () => {
      setIsOnline(true);
      if (waitingForNetwork) {
        // Tiny debounce so the network stack settles before we probe.
        setTimeout(() => { void handleRetry(); }, 400);
      }
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      probeAbortRef.current?.abort();
    };
  }, [waitingForNetwork, handleRetry]);

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
