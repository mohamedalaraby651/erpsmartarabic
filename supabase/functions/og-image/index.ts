// Dynamic Open Graph image generator.
//
// Returns a 1200x630 SVG share image rendered from query params, so any
// document page (invoice, quote, customer profile…) can produce a unique
// social preview without us having to pre-render thousands of PNGs.
//
// Usage:
//   /functions/v1/og-image?title=فاتورة%20%23INV-001&subtitle=شركة%20الأفق&meta=2,450%20ر.س
//
// Query params (all optional):
//   title    — main heading (e.g. invoice number)
//   subtitle — secondary line (e.g. customer name)
//   meta     — small line at the bottom (e.g. total or date)
//   variant  — "invoice" | "customer" | "quote" | default — colors a stripe
//
// We return SVG (not PNG) because Deno Edge runtime has no native rasterizer.
// Twitter, WhatsApp, Slack, Telegram all render image/svg+xml previews.
// Facebook/LinkedIn fall back to the static og-image.jpg in index.html.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, if-none-match",
  "Access-Control-Expose-Headers": "etag",
};

// Bump when the SVG template changes so caches refresh.
const TEMPLATE_VERSION = "v2";

// FNV-1a 32-bit hash — small, dependency-free, good enough for ETag.
function fnv1a(str: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}

const VARIANT_COLORS: Record<string, string> = {
  invoice: "#3b82f6",
  quote: "#a855f7",
  customer: "#10b981",
  supplier: "#f59e0b",
  default: "#3b82f6",
};

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max - 1) + "…" : s;
}

Deno.serve((req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const url = new URL(req.url);
  const title = escapeXml(truncate(url.searchParams.get("title") ?? "نظرة", 40));
  const subtitle = escapeXml(truncate(url.searchParams.get("subtitle") ?? "نظام إدارة الأعمال الذكي", 60));
  const meta = escapeXml(truncate(url.searchParams.get("meta") ?? "", 50));
  const variant = url.searchParams.get("variant") ?? "default";
  const accent = VARIANT_COLORS[variant] ?? VARIANT_COLORS.default;

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0f1b3d"/>
      <stop offset="100%" stop-color="#1e3a5f"/>
    </linearGradient>
    <linearGradient id="glow" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="${accent}" stop-opacity="0"/>
      <stop offset="50%" stop-color="${accent}" stop-opacity="0.8"/>
      <stop offset="100%" stop-color="${accent}" stop-opacity="0"/>
    </linearGradient>
  </defs>

  <rect width="1200" height="630" fill="url(#bg)"/>
  <rect x="0" y="0" width="1200" height="6" fill="${accent}"/>

  <!-- Decorative grid -->
  <g opacity="0.08" stroke="#ffffff" stroke-width="1">
    ${Array.from({ length: 12 }, (_, i) => `<line x1="${i * 100}" y1="0" x2="${i * 100}" y2="630"/>`).join("")}
    ${Array.from({ length: 7 }, (_, i) => `<line x1="0" y1="${i * 90}" x2="1200" y2="${i * 90}"/>`).join("")}
  </g>

  <!-- Brand mark -->
  <g direction="rtl">
    <text x="1100" y="90" text-anchor="end" font-family="Cairo, Arial, sans-serif"
          font-size="32" fill="#94a3b8" font-weight="600">نظرة</text>
    <circle cx="1130" cy="80" r="12" fill="${accent}"/>
  </g>

  <!-- Title -->
  <text x="1100" y="290" text-anchor="end" font-family="Cairo, Arial, sans-serif"
        font-size="84" fill="#ffffff" font-weight="800" direction="rtl">${title}</text>

  <!-- Subtitle -->
  <text x="1100" y="370" text-anchor="end" font-family="Cairo, Arial, sans-serif"
        font-size="40" fill="#cbd5e1" font-weight="500" direction="rtl">${subtitle}</text>

  <!-- Glow line -->
  <rect x="100" y="430" width="1000" height="3" fill="url(#glow)"/>

  ${meta ? `<text x="1100" y="510" text-anchor="end" font-family="Cairo, Arial, sans-serif"
        font-size="32" fill="${accent}" font-weight="700" direction="rtl">${meta}</text>` : ""}

  <text x="1100" y="585" text-anchor="end" font-family="Cairo, Arial, sans-serif"
        font-size="20" fill="#64748b" direction="rtl">erpsmartarabic1.lovable.app</text>
</svg>`;

  // Strong ETag derived from inputs + template version. Same params → same
  // ETag → social crawlers and CDNs can revalidate with a cheap 304.
  const etag = `"${TEMPLATE_VERSION}-${fnv1a(`${title}|${subtitle}|${meta}|${variant}`)}"`;
  const ifNoneMatch = req.headers.get("if-none-match");
  if (ifNoneMatch && ifNoneMatch === etag) {
    return new Response(null, {
      status: 304,
      headers: {
        ...corsHeaders,
        ETag: etag,
        "Cache-Control": "public, max-age=86400, s-maxage=604800, stale-while-revalidate=604800, immutable",
      },
    });
  }

  return new Response(svg, {
    headers: {
      ...corsHeaders,
      "Content-Type": "image/svg+xml; charset=utf-8",
      ETag: etag,
      Vary: "Accept-Encoding",
      // Cache aggressively at the browser + edge; allow stale-while-revalidate
      // so social previews stay snappy even as we iterate the template.
      "Cache-Control": "public, max-age=86400, s-maxage=604800, stale-while-revalidate=604800, immutable",
    },
  });
});
