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
installGlobalErrorHandlers();

// ---------------------------------------------------------------------------
// Ghost Service Worker cleanup
// ---------------------------------------------------------------------------
// Earlier versions of this project registered a service worker (PWA). The
// project no longer ships one, but stale SWs persist in users' browsers and
// keep serving outdated cached HTML/JS — which is the main cause of the
// white-screen-on-load issue. This block unregisters any leftover SW and
// clears CacheStorage exactly once per browser, then is a no-op afterwards.
// TODO(remove-after: 2026-06-01): drop this block once telemetry confirms
// the install base has rotated through at least one fresh load.
// ---------------------------------------------------------------------------
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  // Bumped to v2 (2026-04-26): re-runs cleanup for users who already passed v1
  // so they pick up the latest bundle-splitting + Auth retry fixes that were
  // shipped after the original cleanup ran.
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
          // If we actually unregistered something, force one fresh load so
          // the user immediately gets the new bundle.
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
initializeTheme();

// Initialize performance monitoring
measureWebVitals();

// Render the app
createRoot(document.getElementById("root")!).render(<App />);
markPhase('react_mounted');

// Drain any events the index.html shield buffered before React loaded.
drainBootstrapEvents();

// Auto-flush PDF export telemetry on idle / page hide (best-effort).
import('./lib/pdf/diagnostics/telemetryScheduler')
  .then(({ installPdfTelemetryAutoFlush }) => installPdfTelemetryAutoFlush())
  .catch(() => { /* never block boot */ });

if (import.meta.env.DEV) {
  // eslint-disable-next-line no-console
  console.log('[main] React root mounted');
}

// Prefetch common routes after initial load
if (typeof window !== 'undefined') {
  window.addEventListener('load', () => {
    setTimeout(logBundleInfo, 1000);
    prefetchCommonRoutes();
  });
}
