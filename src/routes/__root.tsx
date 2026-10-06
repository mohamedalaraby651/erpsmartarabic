import { useEffect, type ReactNode } from "react";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  HeadContent,
  Scripts,
  useRouter,
} from "@tanstack/react-router";
import { QueryClientProvider, type QueryClient } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import { ReloadPrompt } from "@/components/offline/ReloadPrompt";
import { AppErrorBoundary } from "@/components/errors/AppErrorBoundary";
import { useSeo } from "@/hooks/useSeo";
import NotFound from "@/pages/NotFound";
import { reportLovableError } from "@/lib/lovable-error-reporting";
import { runClientBoot } from "@/lib/clientBoot";
import appCss from "../styles.css?url";

const SITE_TITLE = "نظرة - نظام إدارة الأعمال الذكي";
const SITE_DESCRIPTION =
  "نظام ERP متكامل لإدارة العملاء والمبيعات والمخزون والمحاسبة - يعمل بدون إنترنت مع دعم تعدد الشركات";
const SITE_URL = "https://erpsmartarabic1.lovable.app/";
const OG_IMAGE = "https://erpsmartarabic1.lovable.app/og-image.jpg";
const CAIRO_CSS = "https://fonts.googleapis.com/css2?family=Cairo:wght@400;700&display=swap";

const CSP =
  "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.gpteng.co; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: blob: https:; connect-src 'self' https://*.supabase.co wss://*.supabase.co https://fonts.googleapis.com https://fonts.gstatic.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self';";

const STRUCTURED_DATA = JSON.stringify({
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      name: "نظرة",
      alternateName: "Nazra ERP",
      url: SITE_URL,
      logo: "https://erpsmartarabic1.lovable.app/icons/icon-512x512.png",
    },
    { "@type": "WebSite", name: SITE_TITLE, url: SITE_URL, inLanguage: "ar" },
    {
      "@type": "SoftwareApplication",
      name: "نظرة",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web, iOS, Android",
      url: SITE_URL,
      description: SITE_DESCRIPTION,
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    },
  ],
});

// Pre-paint theme bootstrap (ported from main.tsx initializeTheme): sets the
// `dark` class before first paint to avoid a theme flash. The full theme
// config (colors, fonts, sizes) is applied after hydration by runClientBoot().
const THEME_BOOTSTRAP = `(function(){try{var c=JSON.parse(localStorage.getItem('user-theme-config')||'{}');var t=c.theme||'system';var d=t==='dark'||(t==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',d);}catch(e){}})();`;

// Pre-boot error buffer (ported from index.html): records errors thrown
// before React hydrates so runtimeTelemetry can drain them after mount.
const PREBOOT_ERROR_BUFFER = `(function(){var K='lvbl:runtime-events:v1';function b(t,m,x){try{var r=localStorage.getItem(K);var a=r?JSON.parse(r):[];a.push({type:t,message:String(m||'').slice(0,500),timestamp:new Date().toISOString(),url:location.pathname+location.search,userAgent:navigator.userAgent,metadata:x||{}});if(a.length>20)a=a.slice(-20);localStorage.setItem(K,JSON.stringify(a));}catch(e){}try{window.__LVBL_BOOT_EVENTS__=window.__LVBL_BOOT_EVENTS__||[];window.__LVBL_BOOT_EVENTS__.push({type:t,message:String(m||''),timestamp:new Date().toISOString(),url:location.pathname,userAgent:navigator.userAgent,metadata:x||{}});}catch(e){}}window.addEventListener('error',function(e){b('boot_error',e.message||'unknown boot error',{filename:e.filename||null,lineno:e.lineno||null,colno:e.colno||null,source:'root-preboot'});});window.addEventListener('unhandledrejection',function(e){var r=e.reason;b('boot_error',!r?'unknown runtime error':typeof r==='string'?r:(r.message||r.name||String(r)),{source:'root-preboot-rejection'});});})();`;

// Preview-link banner (ported from index.html).
const PREVIEW_BANNER = `(function(){try{if(location.hostname.indexOf('id-preview--')===-1)return;var go=function(){var bar=document.createElement('div');bar.setAttribute('dir','rtl');bar.style.cssText='position:fixed;top:0;left:0;right:0;z-index:99999;background:#fef3c7;color:#92400e;border-bottom:1px solid #f59e0b;padding:6px 12px;font-family:Cairo,sans-serif;font-size:12px;display:flex;align-items:center;justify-content:space-between;gap:8px';bar.innerHTML='<span>⚠️ هذا رابط معاينة محمي. للوصول الفعلي للنظام:</span><a href="https://erpsmartarabic1.lovable.app" style="background:#f59e0b;color:#fff;text-decoration:none;border-radius:6px;padding:3px 10px;font-weight:600">افتح النسخة الرسمية</a>';document.body.appendChild(bar);};if(document.body)go();else document.addEventListener('DOMContentLoaded',go);}catch(e){}})();`;

const CRITICAL_CSS = `body{font-family:'Cairo',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;direction:rtl;margin:0;min-height:100vh;}`;

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes",
      },
      { name: "google-site-verification", content: "3d03T10mQkqh4XGwHgspVQeoQXOltKGPIG_s1BhMXM4" },
      { httpEquiv: "Content-Security-Policy", content: CSP },
      { title: SITE_TITLE },
      { name: "title", content: SITE_TITLE },
      { name: "description", content: SITE_DESCRIPTION },
      { name: "author", content: "Nazra" },
      { name: "keywords", content: "ERP, نظام إدارة, المبيعات, المخزون, الفواتير, العملاء, الموردين" },
      { name: "theme-color", content: "#3b82f6" },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "default" },
      { name: "apple-mobile-web-app-title", content: "نظرة" },
      { name: "application-name", content: "نظرة" },
      { name: "msapplication-TileColor", content: "#3b82f6" },
      { name: "msapplication-TileImage", content: "/icons/icon-144x144.png" },
      { name: "msapplication-config", content: "none" },
      { property: "og:type", content: "website" },
      { property: "og:url", content: SITE_URL },
      { property: "og:title", content: SITE_TITLE },
      { property: "og:description", content: SITE_DESCRIPTION },
      { property: "og:image", content: OG_IMAGE },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { property: "og:image:alt", content: SITE_TITLE },
      { property: "og:locale", content: "ar_SA" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:url", content: SITE_URL },
      { name: "twitter:title", content: SITE_TITLE },
      { name: "twitter:description", content: SITE_DESCRIPTION },
      { name: "twitter:image", content: OG_IMAGE },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", type: "image/x-icon", href: "/favicon.ico" },
      { rel: "icon", type: "image/png", sizes: "32x32", href: "/icons/icon-72x72.png" },
      { rel: "icon", type: "image/png", sizes: "16x16", href: "/icons/icon-72x72.png" },
      { rel: "apple-touch-icon", href: "/icons/icon-152x152.png" },
      { rel: "apple-touch-icon", sizes: "120x120", href: "/icons/icon-128x128.png" },
      { rel: "apple-touch-icon", sizes: "152x152", href: "/icons/icon-152x152.png" },
      { rel: "apple-touch-icon", sizes: "180x180", href: "/icons/icon-192x192.png" },
      { rel: "apple-touch-icon", sizes: "167x167", href: "/icons/icon-192x192.png" },
      { rel: "apple-touch-startup-image", href: "/icons/icon-512x512.png" },
      { rel: "canonical", href: SITE_URL },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "preconnect", href: "https://npwofemokwddtutugmas.supabase.co" },
      { rel: "dns-prefetch", href: "https://fonts.googleapis.com" },
      { rel: "dns-prefetch", href: "https://fonts.gstatic.com" },
      { rel: "stylesheet", href: CAIRO_CSS },
    ],
    scripts: [
      { children: THEME_BOOTSTRAP },
      { children: PREBOOT_ERROR_BUFFER },
      { type: "application/ld+json", children: STRUCTURED_DATA },
    ],
    styles: [{ children: CRITICAL_CSS }],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFound,
  errorComponent: RootErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        <noscript>
          <div style={{ padding: "2rem", textAlign: "center", fontFamily: "Cairo,sans-serif", direction: "rtl" }}>
            <h1 style={{ color: "#dc2626" }}>هذا التطبيق يحتاج إلى تفعيل JavaScript</h1>
            <p>يرجى تفعيل JavaScript في إعدادات المتصفح ثم إعادة تحميل الصفحة.</p>
          </div>
        </noscript>
        {children}
        <script dangerouslySetInnerHTML={{ __html: PREVIEW_BANNER }} />
        <Scripts />
      </body>
    </html>
  );
}

/** Drives <title>, description, canonical, Open Graph & Twitter tags per route. */
function RouteSeo(): null {
  useSeo();
  return null;
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  useEffect(() => {
    runClientBoot();
  }, []);

  return (
    <AppErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <ReloadPrompt />
            <RouteSeo />
            <Outlet />
          </TooltipProvider>
        </AuthProvider>
      </QueryClientProvider>
    </AppErrorBoundary>
  );
}

function RootErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();

  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error(error);
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div dir="rtl" className="flex min-h-screen items-center justify-center bg-background p-6 text-foreground">
      <div className="w-full max-w-md space-y-4 rounded-lg border border-border bg-card p-8 text-center shadow-sm">
        <h1 className="text-xl font-bold">This page didn't load</h1>
        <p className="text-sm text-muted-foreground">تعذّر تحميل هذه الصفحة. حاول مرة أخرى أو عد إلى الرئيسية.</p>
        <div className="flex justify-center gap-3">
          <button
            type="button"
            className="min-h-11 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
            onClick={() => {
              void router.invalidate();
              reset();
            }}
          >
            Try again · إعادة المحاولة
          </button>
          <Link
            to="/"
            className="inline-flex min-h-11 items-center rounded-md border border-border px-4 py-2 text-sm font-semibold"
          >
            Go home · الرئيسية
          </Link>
        </div>
      </div>
    </div>
  );
}
