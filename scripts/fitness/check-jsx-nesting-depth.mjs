#!/usr/bin/env node
/**
 * check-jsx-nesting-depth.mjs — Wave 2 Closure Phase C (warn mode).
 * Heuristic: JSX opening tag depth (indentation-based) must stay ≤ 8.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, extname, relative } from "node:path";
const ROOT = process.cwd(), SRC = join(ROOT, "src");
const ENFORCING = process.env.CHECK_JSX_NESTING_ENFORCE === "1";
const walk = (d, a=[]) => { for (const n of readdirSync(d)) { if (n.startsWith(".")) continue; const f=join(d,n); const rel=relative(ROOT,f).replace(/\\/g,"/"); if (rel.includes("__tests__")) continue; const s=statSync(f); if (s.isDirectory()) walk(f,a); else if (extname(n)===".tsx") a.push(rel); } return a; };
const v = [];
for (const rel of walk(SRC)) {
  const src = readFileSync(join(ROOT,rel), "utf8");
  let max = 0;
  for (const line of src.split("\n")) {
    const m = line.match(/^(\s*)<[A-Za-z]/);
    if (!m) continue;
    const indent = m[1].replace(/\t/g, "  ").length / 2;
    if (indent > max) max = indent;
  }
  if (max > 8) v.push({ file: rel, depth: max });
}
console.log(`[check-jsx-nesting-depth] ${ENFORCING?"ENFORCING":"WARN"} — ${v.length} files over depth 8`);
for (const x of v.slice(0,25)) console.log(`  ${x.file} (depth ${x.depth})`);
process.exit(ENFORCING && v.length ? 1 : 0);
