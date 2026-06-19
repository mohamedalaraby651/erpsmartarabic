#!/usr/bin/env node
// scripts/audits/bundle-report.mjs
// UX-0: Build + parse rollup-plugin-visualizer JSON template.
import { execSync, execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync, readFileSync, existsSync, statSync, readdirSync } from "node:fs";
import { dirname, resolve, relative } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../..");
const OUT = resolve(__dirname, "output/bundle-report.json");
const STATS = resolve(ROOT, "scripts/audits/output/.bundle-stats.json");

// Run build with visualizer plugin injected via env var consumed by vite.config patching (fallback: just measure dist files).
let visualizerData = null;

// Try injecting visualizer via temporary vite plugin: write a small wrapper config.
const tmpConfig = resolve(ROOT, "scripts/audits/.vite.audit.config.ts");
writeFileSync(tmpConfig, `
import base from "../../vite.config";
import { visualizer } from "rollup-plugin-visualizer";
const cfg: any = typeof base === "function" ? (base as any)({ mode: "production", command: "build" }) : base;
cfg.plugins = [...(cfg.plugins ?? []), visualizer({ filename: "${STATS.replace(/\\/g, "/")}", template: "raw-data", gzipSize: true, brotliSize: false, sourcemap: false })];
export default cfg;
`);

try {
  execSync(`bunx vite build --config ${tmpConfig} --logLevel error`, { cwd: ROOT, stdio: ["ignore", "ignore", "pipe"], env: { ...process.env, NODE_ENV: "production" }, maxBuffer: 256 * 1024 * 1024 });
} catch (e) {
  console.error("[bundle] vite build failed:", e.message?.slice(0, 500));
}

if (existsSync(STATS)) {
  try { visualizerData = JSON.parse(readFileSync(STATS, "utf8")); } catch { visualizerData = null; }
}

// Measure dist/assets sizes
const dist = resolve(ROOT, "dist");
const assets = [];
function walk(d) {
  if (!existsSync(d)) return;
  for (const e of readdirSync(d, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const p = resolve(d, e.name);
    if (e.isDirectory()) walk(p);
    else if (/\.(js|css)$/.test(e.name)) {
      const st = statSync(p);
      assets.push({ file: relative(dist, p), bytes: st.size });
    }
  }
}
walk(dist);
assets.sort((a, b) => a.file.localeCompare(b.file));
const totalBytes = assets.reduce((a, b) => a + b.bytes, 0);

// Top deps from visualizer (if available)
let topDeps = [];
let duplicates = [];
if (visualizerData && Array.isArray(visualizerData.nodeParts)) {
  // Flatten by id
  const sizes = {};
  for (const [id, part] of Object.entries(visualizerData.nodeParts)) {
    const meta = visualizerData.nodeMetas[id];
    if (!meta) continue;
    const name = meta.id;
    const m = name.match(/node_modules\/((?:@[^/]+\/)?[^/]+)/);
    const key = m ? m[1] : null;
    if (!key) continue;
    sizes[key] = (sizes[key] ?? 0) + (part.gzipLength ?? part.renderedLength ?? 0);
  }
  topDeps = Object.entries(sizes).sort((a, b) => b[1] - a[1]).slice(0, 20).map(([name, gzip]) => ({ name, gzipBytes: gzip }));
  // duplicate detection
  const versions = {};
  for (const meta of Object.values(visualizerData.nodeMetas)) {
    const m = meta.id.match(/node_modules\/((?:@[^/]+\/)?[^/]+)\/.+/);
    if (!m) continue;
    versions[m[1]] = versions[m[1]] ?? new Set();
    versions[m[1]].add(meta.id.replace(/.*node_modules\//, "").split("/").slice(0, 2).join("/"));
  }
  // (Heuristic — not exact for nested copies; placeholder until UX-1.)
}

const report = {
  schemaVersion: 1,
  baselineVersion: "UX-0",
  visualizerAvailable: !!visualizerData,
  totalBytes,
  totalAssets: assets.length,
  topAssets: [...assets].sort((a, b) => b.bytes - a.bytes).slice(0, 20),
  topDependenciesGzip: topDeps,
  duplicatePackages: duplicates,
  treeShakingOpportunities: [],
  notes: visualizerData ? null : "rollup-plugin-visualizer stats missing; rerun after fixing build.",
};

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(report, null, 2) + "\n");
console.log(`[bundle] totalBytes=${totalBytes} assets=${assets.length} visualizer=${!!visualizerData} → ${OUT}`);
