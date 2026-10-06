/**
 * Client-only bootstrap — ported from the Classic src/main.tsx.
 *
 * Runs exactly once after hydration (called from RootComponent's useEffect).
 * Each step is isolated in its own try/catch so an instrumentation failure
 * can never break the app.
 */
import { initializeTheme } from "@/lib/themeManager";
import { measureWebVitals, logBundleInfo } from "@/lib/performanceMonitor";
import { prefetchCommonRoutes } from "@/lib/prefetch";
import { installGlobalErrorHandlers, drainBootstrapEvents, emitTelemetry } from "@/lib/runtimeTelemetry";
import { markPhase } from "@/lib/bootMarks";

let booted = false;

function assertSupabaseEnv(): void {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  const missing: string[] = [];
  if (!url || typeof url !== "string" || url.trim() === "") missing.push("VITE_SUPABASE_URL");
  if (!key || typeof key !== "string" || key.trim() === "") missing.push("VITE_SUPABASE_PUBLISHABLE_KEY");
  if (missing.length > 0) {
    // eslint-disable-next-line no-console
    console.error(
      `[boot] Missing required environment variables: ${missing.join(", ")}. ` +
        `Reconnect Lovable Cloud or restore the .env file before continuing.`,
    );
  }
}

function cleanupGhostServiceWorkers(): void {
  if (!("serviceWorker" in navigator)) return;
  const FLAG = "sw-cleanup:done:v2";
  try {
    if (localStorage.getItem(FLAG) === "1") return;
    navigator.serviceWorker
      .getRegistrations()
      .then((regs) => Promise.all(regs.map((r) => r.unregister())))
      .then((results) => {
        if ("caches" in window) {
          return caches
            .keys()
            .then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
            .then(() => results);
        }
        return results;
      })
      .then((results) => {
        try {
          localStorage.setItem(FLAG, "1");
        } catch {
          /* ignore */
        }
        if (Array.isArray(results) && results.some(Boolean)) {
          emitTelemetry("sw_cleanup_reload", "unregistered ghost service worker", {
            metadata: { count: results.filter(Boolean).length },
          });
          window.location.reload();
        }
      })
      .catch(() => {
        /* never break startup */
      });
  } catch {
    /* localStorage may be disabled */
  }
}

function scheduleIdle(cb: () => void): void {
  const w = window as Window & {
    requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
  };
  if (typeof w.requestIdleCallback === "function") {
    w.requestIdleCallback(cb, { timeout: 2000 });
  } else {
    setTimeout(cb, 1);
  }
}

export function runClientBoot(): void {
  if (booted || typeof window === "undefined") return;
  booted = true;

  try { assertSupabaseEnv(); } catch { /* ignore */ }
  try { markPhase("js_executed"); } catch { /* ignore */ }
  try {
    installGlobalErrorHandlers();
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn("[boot] installGlobalErrorHandlers failed", err);
  }
  cleanupGhostServiceWorkers();
  try {
    initializeTheme();
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn("[boot] initializeTheme failed", err);
  }
  try {
    measureWebVitals();
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn("[boot] measureWebVitals failed", err);
  }
  try { markPhase("react_mounted"); } catch { /* ignore */ }
  try { drainBootstrapEvents(); } catch { /* ignore */ }

  scheduleIdle(() => {
    import("@/lib/pdf/diagnostics/telemetryScheduler")
      .then(({ installPdfTelemetryAutoFlush }) => installPdfTelemetryAutoFlush())
      .catch(() => {
        /* never block boot */
      });
  });

  const afterLoad = () =>
    scheduleIdle(() => {
      try { logBundleInfo(); } catch { /* ignore */ }
      try { prefetchCommonRoutes(); } catch { /* ignore */ }
    });
  if (document.readyState === "complete") afterLoad();
  else window.addEventListener("load", afterLoad, { once: true });
}
