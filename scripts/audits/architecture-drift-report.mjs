#!/usr/bin/env node
/**
 * Architecture Drift Report — UX3A Wave 1.
 * Compares the current per-layer file counts + cross-layer edge counts against
 * BASELINE-UX3A-000 and emits a JSON + Markdown summary. Non-fatal in Wave 1
 * (report-only) but wired into the gate so drift is visible.
 */
import { readdirSync, readFileSync, statSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join, resolve, dirname, extname, relative } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..", "..");
const SRC = join(ROOT, "src");
const OUT = join(ROOT, "scripts", "audits", "output", "ux3a-drift");
const LAYERS = ["kernel", "platform", "design-system", "ui-contracts", "ux", "features", "pages", "ui", "components"];
const EXT = new Set([".ts", ".tsx", ".js", ".jsx"]);

function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name.startsWith(".")) continue;
    const abs = join(dir, name);
    const st = statSync(abs);
    if (st.isDirectory()) walk(abs, out);
    else if (EXT.has(extname(name))) out.push(abs);
  }
  return out;
}

function layerOf(rel) {
  const top = rel.split("/")[0];
  return LAYERS.includes(top) ? top : "other";
}

const files = walk(SRC).map((f) => relative(SRC, f).split("\\").join("/"));
const perLayer = Object.fromEntries(LAYERS.map((l) => [l, 0]));
perLayer.other = 0;
for (const f of files) perLayer[layerOf(f)] += 1;

const edges = {};
const IMPORT_RE = /from\s+["'](@\/[^"']+)["']/g;
for (const rel of files) {
  const src = readFileSync(join(SRC, rel), "utf8");
  const from = layerOf(rel);
  let m;
  while ((m = IMPORT_RE.exec(src)) !== null) {
    const target = m[1].slice(2).split("/")[0];
    if (!LAYERS.includes(target)) continue;
    const key = `${from}->${target}`;
    edges[key] = (edges[key] ?? 0) + 1;
  }
}

const report = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  baseline: "BASELINE-UX3A-000",
  totalFiles: files.length,
  filesPerLayer: perLayer,
  crossLayerEdges: edges,
  facadeUsage: {
    "@/kernel": countImports("@/kernel"),
    "@/platform": countImports("@/platform"),
    "@/platform/ports": countImports("@/platform/ports"),
    "@/platform/runtime": countImports("@/platform/runtime"),
    "@/platform/shell": countImports("@/platform/shell"),
  },
};

function countImports(spec) {
  const rx = new RegExp(`from\\s+["']${spec.replace(/[/]/g, "\\/")}(?:["']|\\/)`, "g");
  let count = 0;
  for (const rel of files) {
    const src = readFileSync(join(SRC, rel), "utf8");
    count += (src.match(rx) ?? []).length;
  }
  return count;
}

mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, "wave1.json"), JSON.stringify(report, null, 2));
const md = [
  `# Architecture Drift Report — UX3A Wave 1`,
  ``,
  `- Baseline: ${report.baseline}`,
  `- Generated: ${report.generatedAt}`,
  `- Total files under \`src/\`: ${report.totalFiles}`,
  ``,
  `## Files per layer`,
  ``,
  ...Object.entries(report.filesPerLayer).map(([k, v]) => `- ${k}: ${v}`),
  ``,
  `## Cross-layer edges (import count)`,
  ``,
  ...Object.entries(report.crossLayerEdges).sort().map(([k, v]) => `- ${k}: ${v}`),
  ``,
  `## Public façade usage`,
  ``,
  ...Object.entries(report.facadeUsage).map(([k, v]) => `- ${k}: ${v}`),
  ``,
].join("\n");
writeFileSync(join(OUT, "wave1.md"), md);
console.log(`[audit:architecture-drift-report] wrote ${relative(ROOT, join(OUT, "wave1.json"))}`);
