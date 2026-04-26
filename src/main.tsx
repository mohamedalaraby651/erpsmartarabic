import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initializeTheme } from "./lib/themeManager";
import { measureWebVitals, logBundleInfo } from "./lib/performanceMonitor";
import { prefetchCommonRoutes } from "./lib/prefetch";

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
  const FLAG = 'sw-cleanup:done:v1';
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
