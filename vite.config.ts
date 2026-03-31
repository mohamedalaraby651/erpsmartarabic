import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Core React
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          // Data fetching
          'vendor-query': ['@tanstack/react-query'],
          // UI Components - Radix
          'vendor-ui-core': [
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-select',
            '@radix-ui/react-popover',
            '@radix-ui/react-tooltip',
          ],
          'vendor-ui-extended': [
            '@radix-ui/react-tabs',
            '@radix-ui/react-accordion',
            '@radix-ui/react-checkbox',
            '@radix-ui/react-switch',
            '@radix-ui/react-radio-group',
            '@radix-ui/react-slider',
            '@radix-ui/react-scroll-area',
          ],
          // Charts
          'vendor-charts': ['recharts'],
          // PDF Generation
          'vendor-pdf': ['jspdf', 'jspdf-autotable'],
          // Excel Export
          'vendor-excel': ['xlsx'],
          // Date utilities
          'vendor-dates': ['date-fns'],
          // Drag and Drop
          'vendor-dnd': ['@dnd-kit/core', '@dnd-kit/sortable', '@dnd-kit/utilities'],
          // Supabase
          'vendor-supabase': ['@supabase/supabase-js'],
          // IndexedDB
          'vendor-idb': ['idb'],
        },
      },
    },
    chunkSizeWarningLimit: 500,
    // Minification options
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: mode === 'production',
        drop_debugger: mode === 'production',
      },
    },
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['favicon.ico', 'robots.txt', 'icons/*.png', 'screenshots/*.png'],
      manifest: {
        name: 'نظرة - نظام إدارة الأعمال',
        short_name: 'نظرة',
        description: 'نظام ERP متكامل لإدارة العملاء والمبيعات والمخزون والمحاسبة - يعمل بدون إنترنت مع دعم تعدد الشركات',
        theme_color: '#3b82f6',
        background_color: '#0f172a',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        dir: 'rtl',
        lang: 'ar',
        categories: ['business', 'productivity', 'utilities', 'finance'],
        // PWA 2025: Display Override for flexible windowing
        display_override: ['standalone', 'minimal-ui', 'window-controls-overlay'],
        // PWA 2025: Launch Handler for app behavior
        launch_handler: {
          client_mode: ['navigate-existing', 'auto']
        },
        // PWA 2025: Handle Links preference
        handle_links: 'preferred',
        // PWA 2025: Edge Side Panel support
        edge_side_panel: {
          preferred_width: 420
        },
        // PWA 2025: Share Target for receiving shares
        share_target: {
          action: '/share-target',
          method: 'POST',
          enctype: 'multipart/form-data',
          params: {
            title: 'title',
            text: 'text',
            url: 'url',
            files: [
              {
                name: 'files',
                accept: ['image/*', 'application/pdf', '.xlsx', '.xls', '.csv']
              }
            ]
          }
        },
        // PWA 2025: File Handlers for opening files
        file_handlers: [
          {
            action: '/open-file',
            accept: {
              'application/pdf': ['.pdf'],
              'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
              'application/vnd.ms-excel': ['.xls'],
              'text/csv': ['.csv'],
              'image/png': ['.png'],
              'image/jpeg': ['.jpg', '.jpeg'],
              'image/webp': ['.webp']
            }
          }
        ],
        // PWA 2025: Protocol Handlers for custom URLs
        protocol_handlers: [
          {
            protocol: 'web+erp',
            url: '/protocol?action=%s'
          },
          {
            protocol: 'web+invoice',
            url: '/invoices?number=%s'
          },
          {
            protocol: 'web+customer',
            url: '/customers?id=%s'
          },
          {
            protocol: 'web+product',
            url: '/products?id=%s'
          }
        ],
        icons: [
          {
            src: '/icons/icon-72x72.png',
            sizes: '72x72',
            type: 'image/png',
            purpose: 'maskable any'
          },
          {
            src: '/icons/icon-96x96.png',
            sizes: '96x96',
            type: 'image/png',
            purpose: 'maskable any'
          },
          {
            src: '/icons/icon-128x128.png',
            sizes: '128x128',
            type: 'image/png',
            purpose: 'maskable any'
          },
          {
            src: '/icons/icon-144x144.png',
            sizes: '144x144',
            type: 'image/png',
            purpose: 'maskable any'
          },
          {
            src: '/icons/icon-152x152.png',
            sizes: '152x152',
            type: 'image/png',
            purpose: 'maskable any'
          },
          {
            src: '/icons/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable any'
          },
          {
            src: '/icons/icon-384x384.png',
            sizes: '384x384',
            type: 'image/png',
            purpose: 'maskable any'
          },
          {
            src: '/icons/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable any'
          }
        ],
        screenshots: [
          {
            src: '/icons/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            form_factor: 'wide',
            label: 'لوحة التحكم الرئيسية - ERP Smart'
          },
          {
            src: '/icons/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            form_factor: 'narrow',
            label: 'التطبيق على الهاتف'
          }
        ],
        shortcuts: [
          {
            name: 'فاتورة جديدة',
            short_name: 'فاتورة',
            description: 'إنشاء فاتورة مبيعات جديدة',
            url: '/invoices?action=new',
            icons: [{ src: '/icons/icon-96x96.png', sizes: '96x96' }]
          },
          {
            name: 'عميل جديد',
            short_name: 'عميل',
            description: 'إضافة عميل جديد للنظام',
            url: '/customers?action=new',
            icons: [{ src: '/icons/icon-96x96.png', sizes: '96x96' }]
          },
          {
            name: 'أمر بيع جديد',
            short_name: 'بيع',
            description: 'إنشاء أمر بيع جديد',
            url: '/sales-orders?action=new',
            icons: [{ src: '/icons/icon-96x96.png', sizes: '96x96' }]
          },
          {
            name: 'منتج جديد',
            short_name: 'منتج',
            description: 'إضافة منتج جديد للمخزون',
            url: '/products?action=new',
            icons: [{ src: '/icons/icon-96x96.png', sizes: '96x96' }]
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
        // PWA 2025: Enhanced caching strategies
        skipWaiting: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'images-cache-v2',
              expiration: {
                maxEntries: 150,
                maxAgeSeconds: 30 * 24 * 60 * 60 // 30 days
              }
            }
          },
          {
            urlPattern: /\.(?:woff|woff2|ttf|otf|eot)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'fonts-cache-v2',
              expiration: {
                maxAgeSeconds: 365 * 24 * 60 * 60 // 1 year
              }
            }
          },
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/rest\/v1\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache-v2',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 10 * 60 // 10 minutes
              },
              networkTimeoutSeconds: 10,
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/storage\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'storage-cache-v2',
              expiration: {
                maxEntries: 150,
                maxAgeSeconds: 7 * 24 * 60 * 60 // 7 days
              }
            }
          },
          {
            urlPattern: ({ request }: { request: Request }) => request.mode === 'navigate',
            handler: 'NetworkFirst',
            options: {
              cacheName: 'pages-cache-v2',
              expiration: {
                maxEntries: 50
              },
              networkTimeoutSeconds: 5
            }
          }
        ],
        navigateFallback: '/offline.html',
        navigateFallbackDenylist: [/^\/api/, /^\/auth/, /^\/share-target/]
      },
      devOptions: {
        enabled: false
      }
    })
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
