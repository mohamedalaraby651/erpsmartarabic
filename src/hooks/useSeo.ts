import { useEffect } from 'react';
import { useLocation, matchPath } from 'react-router-dom';

const SITE_ORIGIN = 'https://erpsmartarabic1.lovable.app';
/** Brand-wide Open Graph fallback (1200x630, optimized for social shares). */
const DEFAULT_IMAGE = `${SITE_ORIGIN}/og-image.jpg`;

/**
 * Section-specific defaults — used when a route's meta doesn't set its own
 * image. Lets each top-level section get a contextual share preview without
 * having to author one per page. Pages with truly dynamic content (an invoice,
 * a customer profile) should pass `image` via `useSeo({ image })`.
 */
const SECTION_IMAGES: Record<string, string> = {
  // Add per-section OG images here as they're generated:
  // '/customers': `${SITE_ORIGIN}/og-customers.jpg`,
  // '/invoices':  `${SITE_ORIGIN}/og-invoices.jpg`,
};

function imageForPath(pathname: string): string {
  // Match the longest section prefix.
  const match = Object.keys(SECTION_IMAGES)
    .filter((p) => pathname === p || pathname.startsWith(`${p}/`))
    .sort((a, b) => b.length - a.length)[0];
  return match ? SECTION_IMAGES[match] : DEFAULT_IMAGE;
}

export interface SeoMeta {
  title: string;
  description: string;
  /** Absolute URL or path (will be prefixed with SITE_ORIGIN). Optional override; defaults to current path. */
  canonical?: string;
  image?: string;
  /** og:type — defaults to "website". Use "article" for blog posts. */
  type?: 'website' | 'article' | 'product';
  /** If true, search engines should not index this route. */
  noindex?: boolean;
}

/**
 * Per-route SEO configuration. Keys are React Router path patterns
 * (matched in order; first match wins). Add new public routes here.
 *
 * Auth-gated routes are marked noindex so Google doesn't waste crawl budget
 * on URLs that always redirect to /auth. Their titles still update for the
 * browser tab + social shares within the app.
 */
const ROUTE_SEO: Array<{ pattern: string; meta: SeoMeta }> = [
  {
    pattern: '/',
    meta: {
      title: 'نظرة - نظام إدارة الأعمال الذكي',
      description:
        'نظام ERP عربي متكامل لإدارة العملاء والمبيعات والمخزون والمحاسبة - يعمل بدون إنترنت مع دعم تعدد الشركات.',
    },
  },
  {
    pattern: '/landing',
    meta: {
      title: 'نظرة - حلول ERP عربية للشركات الصغيرة والمتوسطة',
      description:
        'اكتشف نظرة: نظام تخطيط موارد المؤسسات العربي الذي يبسّط المبيعات والمخزون والمحاسبة في مكان واحد.',
    },
  },
  {
    pattern: '/auth',
    meta: {
      title: 'تسجيل الدخول - نظرة',
      description: 'سجّل الدخول إلى حساب نظرة لإدارة عملك من أي مكان وفي أي وقت.',
      noindex: true,
    },
  },
  // Authenticated app routes — noindex, but titles/descriptions still update.
  { pattern: '/dashboard', meta: { title: 'لوحة التحكم - نظرة', description: 'نظرة عامة على أداء عملك اليومي.', noindex: true } },
  { pattern: '/customers', meta: { title: 'العملاء - نظرة', description: 'إدارة قاعدة عملائك وأرصدتهم وتفاعلاتهم.', noindex: true } },
  { pattern: '/customers/:id', meta: { title: 'تفاصيل العميل - نظرة', description: 'سجل العميل المالي والتفاعلي الكامل.', noindex: true } },
  { pattern: '/quotations', meta: { title: 'عروض الأسعار - نظرة', description: 'إنشاء ومتابعة عروض الأسعار للعملاء.', noindex: true } },
  { pattern: '/sales-orders', meta: { title: 'أوامر البيع - نظرة', description: 'إدارة دورة المبيعات من الطلب إلى التسليم.', noindex: true } },
  { pattern: '/invoices', meta: { title: 'الفواتير - نظرة', description: 'إصدار ومتابعة فواتير المبيعات والتحصيل.', noindex: true } },
  { pattern: '/payments', meta: { title: 'المدفوعات - نظرة', description: 'تسجيل ومتابعة مدفوعات العملاء.', noindex: true } },
  { pattern: '/credit-notes', meta: { title: 'إشعارات الدائن - نظرة', description: 'إدارة إشعارات الدائن ومرتجعات المبيعات.', noindex: true } },
  { pattern: '/products', meta: { title: 'المنتجات - نظرة', description: 'كتالوج المنتجات والأسعار والأصناف.', noindex: true } },
  { pattern: '/inventory', meta: { title: 'المخزون - نظرة', description: 'متابعة أرصدة المخزون وحركاته.', noindex: true } },
  { pattern: '/suppliers', meta: { title: 'الموردون - نظرة', description: 'إدارة الموردين والمشتريات والمستحقات.', noindex: true } },
  { pattern: '/purchase-orders', meta: { title: 'أوامر الشراء - نظرة', description: 'إنشاء وتتبع أوامر الشراء.', noindex: true } },
  { pattern: '/reports', meta: { title: 'التقارير - نظرة', description: 'تقارير مالية وتحليلية شاملة لعملك.', noindex: true } },
  { pattern: '/settings', meta: { title: 'الإعدادات - نظرة', description: 'إدارة إعدادات الشركة والمستخدمين.', noindex: true } },
];

const FALLBACK: SeoMeta = {
  title: 'نظرة - نظام إدارة الأعمال الذكي',
  description: 'نظام ERP عربي متكامل لإدارة العملاء والمبيعات والمخزون والمحاسبة.',
  noindex: true,
};

function findMeta(pathname: string): SeoMeta {
  for (const { pattern, meta } of ROUTE_SEO) {
    if (matchPath({ path: pattern, end: true }, pathname)) return meta;
  }
  return FALLBACK;
}

function setTag(selector: string, attr: 'name' | 'property', key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(selector);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  if (el.getAttribute('content') !== content) el.setAttribute('content', content);
}

function setMetaName(name: string, content: string) {
  setTag(`meta[name="${name}"]`, 'name', name, content);
}

function setMetaProp(prop: string, content: string) {
  setTag(`meta[property="${prop}"]`, 'property', prop, content);
}

function setCanonical(href: string) {
  let link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!link) {
    link = document.createElement('link');
    link.rel = 'canonical';
    document.head.appendChild(link);
  }
  if (link.href !== href) link.href = href;
}

/**
 * Per-route SEO manager. Updates title, description, canonical, Open Graph,
 * and Twitter Card tags on every navigation. Pass `override` for pages with
 * dynamic content (e.g. invoice detail) that need custom titles.
 */
export function useSeo(override?: Partial<SeoMeta>) {
  const { pathname } = useLocation();

  useEffect(() => {
    const base = findMeta(pathname);
    const meta: SeoMeta = { ...base, ...override };
    const path = pathname === '/' ? '/' : pathname;
    const url = meta.canonical
      ? meta.canonical.startsWith('http')
        ? meta.canonical
        : `${SITE_ORIGIN}${meta.canonical}`
      : `${SITE_ORIGIN}${path}`;
    const image = meta.image ?? DEFAULT_IMAGE;
    const type = meta.type ?? 'website';

    document.title = meta.title;
    setMetaName('title', meta.title);
    setMetaName('description', meta.description);
    setMetaName('robots', meta.noindex ? 'noindex, nofollow' : 'index, follow');

    setMetaProp('og:title', meta.title);
    setMetaProp('og:description', meta.description);
    setMetaProp('og:url', url);
    setMetaProp('og:type', type);
    setMetaProp('og:image', image);
    setMetaProp('og:locale', 'ar_SA');
    setMetaProp('og:site_name', 'نظرة');

    setMetaName('twitter:card', 'summary_large_image');
    setMetaName('twitter:title', meta.title);
    setMetaName('twitter:description', meta.description);
    setMetaName('twitter:url', url);
    setMetaName('twitter:image', image);

    // Canonical: noindex routes still get a canonical pointing to landing,
    // public routes get their own URL.
    setCanonical(meta.noindex ? `${SITE_ORIGIN}/landing` : url);
  }, [pathname, override]);
}
