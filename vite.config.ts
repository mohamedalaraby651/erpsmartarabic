import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
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
    mode === "development" && componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
