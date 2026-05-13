/**
 * Auto-generates public/sitemap.xml from the project's route table.
 *
 * Runs automatically before `vite dev` and `vite build` via the
 * `predev` / `prebuild` npm hooks, so the sitemap stays in sync
 * with the routes shipped in the build — no manual editing needed.
 *
 * To advertise a new public page to search engines, just add an
 * entry to PUBLIC_ROUTES below (or extend `discoverFromAppTsx` if
 * you want it derived from src/App.tsx automatically).
 */

import { writeFileSync, readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const BASE_URL = "https://erpsmartarabic1.lovable.app";

interface SitemapEntry {
  path: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: string;
}

/**
 * Curated list of indexable, publicly-reachable routes.
 *
 * Everything else in src/App.tsx sits behind authentication and
 * must NOT be exposed to crawlers — leaking auth-gated URLs into
 * the sitemap leads to soft-404s in Search Console.
 */
const PUBLIC_ROUTES: SitemapEntry[] = [
  { path: "/", changefreq: "weekly", priority: "1.0" },
  { path: "/landing", changefreq: "weekly", priority: "0.9" },
  { path: "/auth", changefreq: "monthly", priority: "0.5" },
];

/**
 * Best-effort scan of src/App.tsx for any new top-level public
 * routes the maintainer forgot to add to PUBLIC_ROUTES. We only
 * surface a warning — we never auto-add to the sitemap, because
 * we can't tell from a regex whether a route is auth-gated.
 */
function warnOnUnlistedRoutes(known: Set<string>): void {
  const appPath = resolve("src/App.tsx");
  if (!existsSync(appPath)) return;
  const src = readFileSync(appPath, "utf8");
  const routes = new Set<string>();
  for (const m of src.matchAll(/<Route\s+path="([^"*:]+)"/g)) {
    routes.add(m[1].startsWith("/") ? m[1] : `/${m[1]}`);
  }
  // We only care about top-level paths (no slash beyond the first).
  const topLevel = [...routes].filter((p) => p === "/" || /^\/[^/]+$/.test(p));
  const missing = topLevel.filter((p) => !known.has(p));
  if (missing.length) {
    console.warn(
      `[sitemap] ${missing.length} route(s) in App.tsx are not in PUBLIC_ROUTES — ` +
        `add them to scripts/generate-sitemap.ts if they should be indexed:\n  ${missing.join("\n  ")}`,
    );
  }
}

function buildSitemap(entries: SitemapEntry[]): string {
  const urls = entries.map((e) =>
    [
      `  <url>`,
      `    <loc>${BASE_URL}${e.path}</loc>`,
      e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
      e.priority ? `    <priority>${e.priority}</priority>` : null,
      `  </url>`,
    ]
      .filter(Boolean)
      .join("\n"),
  );
  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
    ...urls,
    `</urlset>`,
    ``,
  ].join("\n");
}

const known = new Set(PUBLIC_ROUTES.map((r) => r.path));
warnOnUnlistedRoutes(known);

const xml = buildSitemap(PUBLIC_ROUTES);
writeFileSync(resolve("public/sitemap.xml"), xml);
console.log(`[sitemap] wrote ${PUBLIC_ROUTES.length} entries to public/sitemap.xml`);
