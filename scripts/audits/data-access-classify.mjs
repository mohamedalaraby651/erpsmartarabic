#!/usr/bin/env node
// scripts/audits/data-access-classify.mjs
// UX-0: Classifies all supabase usage in src/** by type.
import { mkdirSync, writeFileSync, readFileSync, readdirSync } from "node:fs";
import { dirname, resolve, relative } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../..");
const SRC = resolve(ROOT, "src");
const OUT = resolve(__dirname, "output/data-access-report.json");

function walk(dir, out = []) {
  for (const e of readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const p = resolve(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === "node_modules") continue;
      walk(p, out);
    } else if (/\.(tsx?|jsx?)$/.test(e.name) && !e.name.endsWith(".d.ts")) {
      out.push(p);
    }
  }
  return out;
}

const files = walk(SRC).map(p => relative(ROOT, p)).sort();

const patterns = [
  { type: "write",     re: /supabase[\s\S]{0,40}\.(?:insert|update|upsert|delete)\s*\(/g },
  { type: "rpc",       re: /supabase[\s\S]{0,40}\.rpc\s*\(/g },
  { type: "storage",   re: /supabase[\s\S]{0,40}\.storage\b/g },
  { type: "realtime",  re: /supabase[\s\S]{0,40}\.channel\s*\(/g },
  { type: "auth",      re: /supabase[\s\S]{0,40}\.auth\b/g },
  { type: "read",      re: /supabase[\s\S]{0,40}\.from\s*\([^)]+\)[\s\S]{0,200}?\.(?:select|single|maybeSingle)\b/g },
];

const layerOf = (f) => {
  const r = f.replace(/^src\//, "");
  if (r.startsWith("components/")) return "ui:components";
  if (r.startsWith("pages/")) return "ui:pages";
  if (r.startsWith("hooks/")) return "hooks";
  if (r.startsWith("lib/repositories/")) return "lib:repositories";
  if (r.startsWith("lib/queries/")) return "lib:queries";
  if (r.startsWith("lib/")) return "lib:other";
  if (r.startsWith("integrations/")) return "integrations";
  if (r.startsWith("domain/")) return "domain";
  return "other";
};

const byTypeByLayer = {};
const byFile = {};
let total = 0;

for (const f of files) {
  const code = readFileSync(resolve(ROOT, f), "utf8");
  const layer = layerOf(f);
  const counts = {};
  let any = false;
  for (const p of patterns) {
    const matches = code.match(p.re);
    if (matches && matches.length) {
      counts[p.type] = matches.length;
      any = true;
      total += matches.length;
      byTypeByLayer[p.type] ??= {};
      byTypeByLayer[p.type][layer] = (byTypeByLayer[p.type][layer] ?? 0) + matches.length;
    }
  }
  if (any) byFile[f] = { layer, counts, total: Object.values(counts).reduce((a, b) => a + b, 0) };
}

// Repository / query reuse via simple import scanning
function listFiles(dir) {
  try { return readdirSync(dir, { withFileTypes: true }).filter(e => e.isFile() && /\.(tsx?|jsx?)$/.test(e.name)).map(e => e.name); } catch { return []; }
}
const repos = listFiles(resolve(SRC, "lib/repositories")).sort();
const queries = listFiles(resolve(SRC, "lib/queries")).sort();
function countConsumers(name) {
  const base = name.replace(/\.(tsx?|jsx?)$/, "");
  let n = 0;
  for (const f of files) {
    if (f.endsWith(name)) continue;
    const code = readFileSync(resolve(ROOT, f), "utf8");
    if (new RegExp(`from\\s+["'][^"']*(?:repositories|queries)/${base}["']`).test(code)) n++;
  }
  return n;
}
const repoUsage = repos.map(r => ({ file: `src/lib/repositories/${r}`, consumers: countConsumers(r) })).sort((a, b) => a.file.localeCompare(b.file));
const queryUsage = queries.map(r => ({ file: `src/lib/queries/${r}`, consumers: countConsumers(r) })).sort((a, b) => a.file.localeCompare(b.file));
const mean = arr => arr.length ? +(arr.reduce((a, b) => a + b.consumers, 0) / arr.length).toFixed(2) : 0;

// UI total (the official baseline number, must match check-data-access.sh)
const uiLayers = ["ui:components", "ui:pages"];
let uiTotal = 0;
for (const t of Object.keys(byTypeByLayer)) {
  for (const l of uiLayers) uiTotal += byTypeByLayer[t][l] ?? 0;
}

const sortedByType = Object.fromEntries(Object.entries(byTypeByLayer).sort().map(([k, v]) => [k, Object.fromEntries(Object.entries(v).sort())]));

const report = {
  schemaVersion: 1,
  baselineVersion: "UX-0",
  totalHits: total,
  uiHits: uiTotal,
  byTypeByLayer: sortedByType,
  repositoryCount: repos.length,
  queryCount: queries.length,
  repositoryReuseMean: mean(repoUsage),
  queryReuseMean: mean(queryUsage),
  repositories: repoUsage,
  queries: queryUsage,
  filesWithHits: Object.keys(byFile).length,
  byFile: Object.fromEntries(Object.entries(byFile).sort()),
};

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(report, null, 2) + "\n");
console.log(`[data-access] total=${total} ui=${uiTotal} repos=${repos.length} queries=${queries.length} → ${OUT}`);
