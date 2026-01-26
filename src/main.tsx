import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initializeTheme } from "./lib/themeManager";

// تهيئة الثيم قبل عرض التطبيق
initializeTheme();

// vite-plugin-pwa handles service worker registration automatically
// with registerType: 'autoUpdate' in vite.config.ts

createRoot(document.getElementById("root")!).render(<App />);
