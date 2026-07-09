#!/usr/bin/env node
/**
 * rendering-cost.mjs — Wave 2 discovery (informational).
 * Flags heavy components that lack `React.memo` / `useMemo` / `useCallback`
 * or are not lazy-loaded despite living under pages/.
 */
import { readdirSync, readFileSync, statSync, mkdirSync, writeFileSync } from "node:fs";
import { join, extname, relative } from "node:path";

const ROOT = process.cwd();
const SRC = join(ROOT, "src");
const OUT = join(ROOT, "scripts/audits/output/wave2-discovery");
const EXTS = new Set([".tsx"]);

function walk(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    if (name.startsWith(".")) continue;
    const full = join(dir, name);
    const s = statSync(full);
    if (s.isDirectory()) walk(full, acc);
    else if (EXTS.has(extname(name))) acc.push(full);
  }
  return acc;
}

const flags = [];
for (const abs of walk(SRC)) {
  const src = readFileSync(abs, "utf8");
  const lines = src.split("\n").length;
  if (lines < 200) continue;
  const rel = relative(ROOT, abs).replace(/\\/g, "/");
  const hasMemo = /\bReact\.memo\b|\bmemo\(/.test(src);
  const hasUseMemo = /\buseMemo\s*\(/.test(src);
  const hasUseCallback = /\buseCallback\s*\(/.test(src);
  const isPage = rel.startsWith("src/pages/");
  flags.push({ file: rel, lines, hasMemo, hasUseMemo, hasUseCallback, isPage });
}
flags.sort((a, b) => b.lines - a.lines);

mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, "rendering-cost.json"), JSON.stringify({ generatedAt: new Date().toISOString(), flags: flags.slice(0, 100) }, null, 2));
console.log(`[rendering-cost] ${flags.length} heavy components`);
