#!/usr/bin/env node
/**
 * performance-audit.mjs — Wave 2 Closure Phase H.
 * React.memo coverage, lazy routes, Suspense, virtualization candidates.
 */
import { readdirSync, readFileSync, statSync, mkdirSync, writeFileSync } from "node:fs";
import { join, extname, relative } from "node:path";

const ROOT = process.cwd();
const SRC = join(ROOT, "src");
const OUT = join(ROOT, "scripts/audits/output/wave2-discovery");
const walk = (d, a = []) => {
  for (const n of readdirSync(d)) {
    if (n.startsWith(".")) continue;
    const f = join(d, n), rel = relative(ROOT, f).replace(/\\/g, "/");
    if (rel.includes("__tests__")) continue;
    const s = statSync(f);
    if (s.isDirectory()) walk(f, a);
    else if (extname(n) === ".tsx") a.push(rel);
  }
  return a;
};

let memoTotal = 0, memoUsed = 0, virtCandidates = 0, suspenseUses = 0, lazyRoutes = 0, routeFiles = 0;
const virtualizationCandidates = [];

for (const rel of walk(SRC)) {
  const src = readFileSync(join(ROOT, rel), "utf8");
  const lines = src.split("\n").length;
  if (lines > 150) { memoTotal++; if (/React\.memo|\bmemo\(/.test(src)) memoUsed++; }
  if (/\.map\(/.test(src) && /<(?:tr|li|Card|Row)\b/.test(src) && lines > 100) { virtCandidates++; virtualizationCandidates.push(rel); }
  if (/<Suspense\b/.test(src)) suspenseUses++;
  if (rel.startsWith("src/pages/")) { routeFiles++; if (/React\.lazy|\blazy\(/.test(src)) lazyRoutes++; }
}

// Also scan App.tsx for lazy() usage across the app
try {
  const app = readFileSync(join(ROOT, "src/App.tsx"), "utf8");
  const lazyMatches = (app.match(/\blazy\(/g) || []).length;
  lazyRoutes = Math.max(lazyRoutes, lazyMatches);
} catch {}

const report = {
  generatedAt: new Date().toISOString(),
  memoCoverage: memoTotal === 0 ? 1 : Number((memoUsed / memoTotal).toFixed(3)),
  memoTotal, memoUsed,
  lazyRoutes, routeFiles,
  suspenseUses,
  virtualizationCandidates: virtualizationCandidates.slice(0, 40),
};

mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, "performance-audit.json"), JSON.stringify(report, null, 2));
console.log(`[performance-audit] memo=${(report.memoCoverage*100).toFixed(1)}% lazyRoutes=${lazyRoutes}/${routeFiles} suspense=${suspenseUses} virtCandidates=${virtCandidates}`);
