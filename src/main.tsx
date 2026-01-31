import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initializeTheme } from "./lib/themeManager";
import { measureWebVitals, logBundleInfo } from "./lib/performanceMonitor";
import { prefetchCommonRoutes } from "./lib/prefetch";

// تهيئة الثيم قبل عرض التطبيق
initializeTheme();

// Initialize performance monitoring
measureWebVitals();

// vite-plugin-pwa handles service worker registration automatically
// with registerType: 'autoUpdate' in vite.config.ts

// Render the app
createRoot(document.getElementById("root")!).render(<App />);

// Prefetch common routes after initial load
if (typeof window !== 'undefined') {
  window.addEventListener('load', () => {
    // Log bundle info in development
    setTimeout(logBundleInfo, 1000);
    // Prefetch common routes
    prefetchCommonRoutes();
  });
}
