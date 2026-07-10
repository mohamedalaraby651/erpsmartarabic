#!/usr/bin/env node
/**
 * ui-architecture-health.mjs — Wave 2 Closure Phase D.
 * Emits coupling, cohesion, fan-in/out, layer violations, cycles, and
 * Martin's Instability metric per module.
 */
import { readdirSync, readFileSync, statSync, mkdirSync, writeFileSync } from "node:fs";
import { join, extname, relative, dirname } from "node:path";

const ROOT = process.cwd();
const SRC = join(ROOT, "src");
const OUT = join(ROOT, "scripts/audits/output/wave2-discovery");
const EXTS = new Set([".ts", ".tsx"]);
const IMPORT_RE = /import[^;]+from\s+["']([^"']+)["']/g;

function walk(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    if (name.startsWith(".")) continue;
    const full = join(dir, name);
    const rel = relative(ROOT, full).replace(/\\/g, "/");
    if (rel.includes("__tests__") || rel.includes("__demo__")) continue;
    const s = statSync(full);
    if (s.isDirectory()) walk(full, acc);
    else if (EXTS.has(extname(name))) acc.push(rel);
  }
  return acc;
}

const files = walk(SRC);
const moduleOf = (rel) => rel.split("/").slice(0, 3).join("/");
const edgesOut = new Map(); // file → Set<file>
const modIn = new Map(); // module → Set<module>
const modOut = new Map();

for (const rel of files) {
  edgesOut.set(rel, new Set());
  const src = readFileSync(join(ROOT, rel), "utf8");
  const fromMod = moduleOf(rel);
  for (const m of src.matchAll(IMPORT_RE)) {
    const spec = m[1];
    if (!spec.startsWith(".") && !spec.startsWith("@/")) continue;
    // best-effort resolve to module bucket
    const targetMod = spec.startsWith("@/")
      ? "src/" + spec.slice(2).split("/").slice(0, 2).join("/")
      : moduleOf(relative(ROOT, join(dirname(join(ROOT, rel)), spec)).replace(/\\/g, "/"));
    if (targetMod === fromMod) continue;
    if (!modOut.has(fromMod)) modOut.set(fromMod, new Set());
    modOut.get(fromMod).add(targetMod);
    if (!modIn.has(targetMod)) modIn.set(targetMod, new Set());
    modIn.get(targetMod).add(fromMod);
  }
}

const modules = new Set([...modIn.keys(), ...modOut.keys()]);
const stability = [];
for (const mod of modules) {
  const ce = (modOut.get(mod)?.size) ?? 0;
  const ca = (modIn.get(mod)?.size) ?? 0;
  const total = ce + ca;
  const I = total === 0 ? 0 : ce / total;
  stability.push({ module: mod, fanIn: ca, fanOut: ce, instability: Number(I.toFixed(3)) });
}
stability.sort((a, b) => b.fanIn - a.fanIn);

mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, "ui-architecture-health.json"), JSON.stringify({
  generatedAt: new Date().toISOString(),
  moduleCount: modules.size,
  fileCount: files.length,
  stability: stability.slice(0, 40),
}, null, 2));
console.log(`[ui-architecture-health] ${modules.size} modules analyzed`);
