#!/usr/bin/env node
/**
 * ui-dep-graph.mjs — Wave 2 discovery (DS-notes #4).
 * Builds a UI-scoped dependency graph over `src/ui/**` and
 * `src/components/**` and emits:
 *  - central components (top in-degree)
 *  - circular deps within the UI surface
 */
import { readdirSync, readFileSync, statSync, mkdirSync, writeFileSync } from "node:fs";
import { join, extname, relative, dirname, resolve } from "node:path";

const ROOT = process.cwd();
const OUT = join(ROOT, "scripts/audits/output/wave2-discovery");
const ROOTS = ["src/ui", "src/components"];
const EXTS = [".tsx", ".ts"];

function walk(dir, acc = []) {
  try {
    for (const name of readdirSync(dir)) {
      if (name.startsWith(".")) continue;
      const full = join(dir, name);
      const s = statSync(full);
      if (s.isDirectory()) walk(full, acc);
      else if (EXTS.includes(extname(name))) acc.push(full);
    }
  } catch { /* ignore */ }
  return acc;
}

function resolveImport(fromFile, spec) {
  if (!spec.startsWith(".") && !spec.startsWith("@/")) return null;
  const base = spec.startsWith("@/") ? join(ROOT, "src", spec.slice(2)) : resolve(dirname(fromFile), spec);
  for (const ext of EXTS) {
    if (statSyncSafe(base + ext)) return base + ext;
    if (statSyncSafe(join(base, "index" + ext))) return join(base, "index" + ext);
  }
  return null;
}
function statSyncSafe(p) { try { return statSync(p); } catch { return null; } }

const files = ROOTS.flatMap((r) => walk(join(ROOT, r)));
const graph = new Map(); // file -> Set of files
for (const f of files) graph.set(f, new Set());

for (const f of files) {
  const src = readFileSync(f, "utf8");
  for (const m of src.matchAll(/from\s+["']([^"']+)["']/g)) {
    const tgt = resolveImport(f, m[1]);
    if (tgt && graph.has(tgt)) graph.get(f).add(tgt);
  }
}

const inDegree = new Map();
for (const f of files) inDegree.set(f, 0);
for (const [, deps] of graph) for (const d of deps) inDegree.set(d, (inDegree.get(d) ?? 0) + 1);

const central = [...inDegree.entries()]
  .sort((a, b) => b[1] - a[1])
  .slice(0, 20)
  .map(([file, deg]) => ({ file: relative(ROOT, file).replace(/\\/g, "/"), inDegree: deg }));

// Circular deps via Tarjan-lite: DFS cycle detection.
const cycles = [];
const color = new Map();
const stack = [];
function dfs(u) {
  color.set(u, 1);
  stack.push(u);
  for (const v of graph.get(u) ?? []) {
    if (color.get(v) === 1) {
      const idx = stack.indexOf(v);
      cycles.push(stack.slice(idx).concat(v).map((x) => relative(ROOT, x).replace(/\\/g, "/")));
    } else if (!color.get(v)) dfs(v);
  }
  stack.pop();
  color.set(u, 2);
}
for (const f of files) if (!color.get(f)) dfs(f);

mkdirSync(OUT, { recursive: true });
writeFileSync(
  join(OUT, "ui-dep-graph.json"),
  JSON.stringify({ generatedAt: new Date().toISOString(), fileCount: files.length, central, cycleCount: cycles.length, cycles: cycles.slice(0, 25) }, null, 2)
);
console.log(`[ui-dep-graph] files=${files.length} central=${central.length} cycles=${cycles.length}`);
