import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import fs from "fs";
import { componentTagger } from "lovable-tagger";

// Build stamp computed once per build. Used by EnvironmentBadge / AboutSystemCard
// so users (and support) can verify which version of the bundle is loaded.
const BUILD_TIME = new Date().toISOString();
const BUILD_ID = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

/**
 * Tiny inline plugin: emits `/version.json` containing the same buildId/buildTime
 * that's inlined into the JS bundle. The frontend can fetch it with cache-bust
 * to detect a newer deployment without parsing HTML.
 */
function versionJsonPlugin() {
  return {
    name: 'lvbl-version-json',
    apply: 'build' as const,
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'version.json',
        source: JSON.stringify({ buildId: BUILD_ID, buildTime: BUILD_TIME }, null, 2),
      });
    },
    // In dev, write it to disk so /version.json is served by Vite dev middleware
    configResolved() {
      try {
        const publicDir = path.resolve(__dirname, 'public');
        if (fs.existsSync(publicDir)) {
          fs.writeFileSync(
            path.join(publicDir, 'version.json'),
            JSON.stringify({ buildId: BUILD_ID, buildTime: BUILD_TIME }, null, 2),
          );
        }
      } catch { /* ignore — non-fatal */ }
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  define: {
    __BUILD_TIME__: JSON.stringify(BUILD_TIME),
    __BUILD_ID__: JSON.stringify(BUILD_ID),
  },
  build: {
    rollupOptions: {
      output: {
        // manualChunks as a function lets us group MANY page chunks into a few
        // logical bundles. The previous setup produced 80+ tiny chunks (one per
        // lazy() page), causing severe HTTP overhead on mobile networks.
        // Now we ship ~5 page-group chunks + dedicated vendor chunks.
        manualChunks(id) {
          // ── Vendors (shared libraries) ─────────────────────────────────
          if (id.includes('node_modules')) {
            if (/[\\/]react(?:-dom|-router-dom)?[\\/]/.test(id)) return 'vendor-react';
            if (id.includes('@tanstack/react-query')) return 'vendor-query';
            if (id.includes('@supabase/supabase-js')) return 'vendor-supabase';
            if (id.includes('recharts')) return 'vendor-charts';
            if (id.includes('jspdf')) return 'vendor-pdf';
            if (id.includes('xlsx')) return 'vendor-excel';
            if (id.includes('date-fns')) return 'vendor-dates';
            if (id.includes('@dnd-kit')) return 'vendor-dnd';
            if (id.includes('idb')) return 'vendor-idb';
            if (id.includes('@radix-ui')) {
              // Split radix into core (used everywhere) vs extended
              if (/(dialog|dropdown-menu|select|popover|tooltip)/.test(id)) {
                return 'vendor-ui-core';
              }
              return 'vendor-ui-extended';
            }
            // All other 3rd-party deps → single vendor bundle
            return 'vendor-misc';
          }

          // ── Application pages grouped by domain ────────────────────────
          // Each group ships as ONE chunk regardless of how many pages it has.
          if (id.includes('/src/pages/')) {
            // Daily core path: customers + billing + payments. The single
            // most-used cluster — split out so first-time users on mobile
            // download ~half of what the old `pages-sales` (524KB) shipped.
            if (/\/pages\/(customers|invoices|payments|credit-notes)\//.test(id)) {
              return 'pages-sales-core';
            }
            // Sales operations: quotations, orders, collections, pricing.
            // Loaded on-demand and via smart prefetch when the user shows
            // intent (sidebar expand / hover on related links).
            if (/\/pages\/(quotations|sales-orders|collections|pricing)\//.test(id)) {
              return 'pages-sales-ops';
            }
            if (/\/pages\/(suppliers|purchase-orders|products|categories|inventory|attachments)\//.test(id)) {
              return 'pages-inventory';
            }
            if (/\/pages\/(treasury|expenses|accounting|reports)\//.test(id)) {
              return 'pages-finance';
            }
            if (/\/pages\/(employees|attendance|tasks|notifications|search|approvals|sync|install)\//.test(id)) {
              return 'pages-workspace';
            }
            if (/\/pages\/admin\//.test(id)) {
              return 'pages-admin';
            }
            if (/\/pages\/platform\//.test(id)) {
              return 'pages-platform';
            }
            if (/\/pages\/settings\//.test(id)) {
              return 'pages-settings';
            }
            // Misc handlers (share, file, protocol, landing, auth, dashboard)
            // remain in main entry (small, used early).
          }
        },
      },
    },
    chunkSizeWarningLimit: 500,
    minify: mode === 'production' ? 'esbuild' : false,
  },
  plugins: [
    react(),
    versionJsonPlugin(),
    mode === "development" && componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
