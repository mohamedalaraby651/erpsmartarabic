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
  const plugin: import('vite').Plugin = {
    name: 'lvbl-version-json',
    apply: 'build',
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'version.json',
        source: JSON.stringify({ buildId: BUILD_ID, buildTime: BUILD_TIME }, null, 2),
      });
    },
    configResolved() {
      // Also write to /public so Vite's dev server serves it at /version.json
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
  return plugin;
}

/**
 * Inject `<link rel="modulepreload">` tags for the most critical vendor
 * chunks into index.html at build time. The browser's default behavior is to
 * preload chunks referenced by `<script type="module">`, but only the entry —
 * not the dynamically-imported vendor chunks. By preloading vendor-react,
 * vendor-supabase and vendor-query in parallel with the entry, we shave a
 * full network round-trip off the cold-start waterfall.
 */
function criticalChunkPreloadPlugin() {
  const CRITICAL = ['vendor-react', 'vendor-supabase', 'vendor-query'];
  const plugin: import('vite').Plugin = {
    name: 'lvbl-critical-preload',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler(html, ctx) {
        try {
          const bundle = ctx.bundle;
          if (!bundle) return html;
          const tags: string[] = [];
          for (const fileName of Object.keys(bundle)) {
            if (!fileName.endsWith('.js')) continue;
            if (CRITICAL.some((c) => fileName.includes(`${c}-`))) {
              tags.push(`<link rel="modulepreload" crossorigin href="/${fileName}">`);
            }
          }
          if (!tags.length) return html;
          return html.replace('</head>', `  ${tags.join('\n  ')}\n  </head>`);
        } catch {
          return html;
        }
      },
    },
  };
  return plugin;
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
        // ── Filename strategy (cache-busting via content hash) ───────────
        // Every emitted JS chunk and static asset includes an 8-char content
        // hash in its filename. The hash changes ONLY when the file's bytes
        // change, so:
        //   • Untouched chunks keep their URL across deploys → browser reuses
        //     the cached copy with zero network round-trips.
        //   • A change in (e.g.) `pages-sales-core` rotates only that chunk's
        //     hash; `pages-finance`, vendor-react, etc. stay cached.
        //
        // Recommended HTTP headers from the static host (Lovable applies
        // these automatically; documented here so future migrations preserve
        // the contract):
        //   /assets/*.[hash].js   →  Cache-Control: public, max-age=31536000, immutable
        //   /assets/*.[hash].css  →  Cache-Control: public, max-age=31536000, immutable
        //   /index.html           →  Cache-Control: no-cache  (must always re-validate
        //                            so users pick up new chunk hashes)
        //   /version.json         →  Cache-Control: no-cache  (used for update detection)
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',

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
    criticalChunkPreloadPlugin(),
    mode === "development" && componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
