import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initializeTheme } from "./lib/themeManager";
import { measureWebVitals, logBundleInfo } from "./lib/performanceMonitor";
import { prefetchCommonRoutes } from "./lib/prefetch";
import {
  installGlobalErrorHandlers,
  drainBootstrapEvents,
  emitTelemetry,
} from "./lib/runtimeTelemetry";
import { markPhase } from "./lib/bootMarks";

// ---------------------------------------------------------------------------
// Pre-mount environment hardening (DevSecOps gate)
// ---------------------------------------------------------------------------
// Fail-fast if Supabase env tokens are missing/empty. Prevents the
// auto-generated client.ts from silently calling createClient(undefined,
// undefined) and producing confusing 401/CORS errors downstream. No `||`
// or `??` fallback literals are permitted for these tokens anywhere in the
// bootstrap lifecycle.
// ---------------------------------------------------------------------------
(function assertSupabaseEnv() {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  const missing: string[] = [];
  if (!url || typeof url !== "string" || url.trim() === "") missing.push("VITE_SUPABASE_URL");
  if (!key || typeof key !== "string" || key.trim() === "") missing.push("VITE_SUPABASE_PUBLISHABLE_KEY");
  if (missing.length > 0) {
    const msg =
      `[boot] Missing required environment variables: ${missing.join(", ")}. ` +
      `Reconnect Lovable Cloud or restore the .env file before continuing.`;
    if (typeof document !== "undefined") {
      const root = document.getElementById("root");
      if (root) {
        root.innerHTML =
          '<div style="font-family:system-ui;padding:24px;color:#b91c1c;background:#fef2f2;border:1px solid #fecaca;border-radius:8px;margin:24px;direction:rtl;text-align:right">' +
          '<strong>تعذّر إقلاع التطبيق</strong><br/>متغيّرات البيئة المطلوبة غير متوفّرة: ' +
          missing.join(", ") +
          "</div>";
      }
    }
    throw new Error(msg);
  }
})();

markPhase('js_executed');

// Install global error capture as early as possible — before React mounts —
// so we catch errors thrown during initial module evaluation too.
// Each early bootstrap step is isolated in its own try/catch so that a single
// instrumentation failure can NEVER prevent createRoot() from running.
try {
  installGlobalErrorHandlers();
} catch (err) {
  // eslint-disable-next-line no-console
  console.warn('[boot] installGlobalErrorHandlers failed', err);
}

// ---------------------------------------------------------------------------
// Ghost Service Worker cleanup
// ---------------------------------------------------------------------------
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  const FLAG = 'sw-cleanup:done:v2';
  try {
    if (localStorage.getItem(FLAG) !== '1') {
      navigator.serviceWorker
        .getRegistrations()
        .then((regs) => Promise.all(regs.map((r) => r.unregister())))
        .then((results) => {
          if ('caches' in window) {
            return caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k)))).then(() => results);
          }
          return results;
        })
        .then((results) => {
          try { localStorage.setItem(FLAG, '1'); } catch { /* ignore */ }
          if (Array.isArray(results) && results.some(Boolean)) {
            emitTelemetry('sw_cleanup_reload', 'unregistered ghost service worker', {
              metadata: { count: results.filter(Boolean).length },
            });
            window.location.reload();
          }
        })
        .catch(() => { /* swallow — never break startup */ });
    }
  } catch { /* localStorage may be disabled — ignore */ }
}

// تهيئة الثيم قبل عرض التطبيق
try {
  initializeTheme();
} catch (err) {
  // eslint-disable-next-line no-console
  console.warn('[boot] initializeTheme failed', err);
}

// Initialize performance monitoring
try {
  measureWebVitals();
} catch (err) {
  // eslint-disable-next-line no-console
  console.warn('[boot] measureWebVitals failed', err);
}

// Render the app — MUST execute even if instrumentation above failed.
createRoot(document.getElementById("root")!).render(<App />);
markPhase('react_mounted');

// Drain any events the index.html shield buffered before React loaded.
try { drainBootstrapEvents(); } catch { /* ignore */ }

// Defer non-critical work to idle time so it can never delay first paint.
const scheduleIdle = (cb: () => void) => {
  if (typeof window === 'undefined') return;
  const w = window as Window & { requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number };
  if (typeof w.requestIdleCallback === 'function') {
    w.requestIdleCallback(cb, { timeout: 2000 });
  } else {
    setTimeout(cb, 1);
  }
};

scheduleIdle(() => {
  import('./lib/pdf/diagnostics/telemetryScheduler')
    .then(({ installPdfTelemetryAutoFlush }) => installPdfTelemetryAutoFlush())
    .catch(() => { /* never block boot */ });
});

if (import.meta.env.DEV) {
  // eslint-disable-next-line no-console
  console.log('[main] React root mounted');
}

// Prefetch common routes after initial load
if (typeof window !== 'undefined') {
  window.addEventListener('load', () => {
    scheduleIdle(() => {
      try { logBundleInfo(); } catch { /* ignore */ }
      try { prefetchCommonRoutes(); } catch { /* ignore */ }
    });
  });
}

