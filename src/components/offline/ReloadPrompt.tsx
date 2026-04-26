import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { emitTelemetry } from '@/lib/runtimeTelemetry';

/**
 * ReloadPrompt — listens for global chunk-load errors and prompts the user
 * to refresh when the cached app cannot reach a chunk anymore (typical after
 * a deploy). Also catches unhandled promise rejections from dynamic imports.
 *
 * Renders nothing in the happy path.
 */
export function ReloadPrompt() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const isChunkErr = (msg: string) =>
      /Loading chunk [\d]+ failed/i.test(msg) ||
      /Failed to fetch dynamically imported module/i.test(msg) ||
      /Importing a module script failed/i.test(msg) ||
      /ChunkLoadError/i.test(msg);

    const onError = (e: ErrorEvent) => {
      if (isChunkErr(e.message || '')) setShow(true);
    };
    const onRejection = (e: PromiseRejectionEvent) => {
      const reason = e.reason as { message?: string; name?: string } | undefined;
      const msg = reason?.message || reason?.name || '';
      if (isChunkErr(msg)) setShow(true);
    };

    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onRejection);
    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onRejection);
    };
  }, []);

  if (!show) return null;

  return (
    <div
      dir="rtl"
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[9999] max-w-sm w-[calc(100%-2rem)] rounded-lg border border-warning/30 bg-background shadow-2xl p-4 flex items-center gap-3 animate-in slide-in-from-bottom-4"
    >
      <div className="flex-1 min-w-0">
        <p className="font-bold text-sm text-foreground">نسخة جديدة متاحة</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          حدّث الصفحة لتحميل آخر إصدار من التطبيق.
        </p>
      </div>
      <Button
        size="sm"
        onClick={() => {
          try {
            // Best-effort cache cleanup before reload
            if ('caches' in window) {
              caches.keys().then((keys) => keys.forEach((k) => caches.delete(k)));
            }
          } catch { /* ignore */ }
          window.location.reload();
        }}
        className="gap-1.5 shrink-0"
      >
        <RefreshCw className="h-3.5 w-3.5" />
        تحديث
      </Button>
    </div>
  );
}
