#!/usr/bin/env node
/**
 * check-component-props-budget.mjs — Wave 2 Closure Phase C (warn mode).
 * Heuristic: each exported `interface *Props` / `type *Props` may declare
 * at most 12 top-level members.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, extname, relative } from "node:path";
const ROOT = process.cwd(), SRC = join(ROOT, "src");
const ENFORCING = process.env.CHECK_COMPONENT_PROPS_ENFORCE === "1";
const walk = (d, a=[]) => { for (const n of readdirSync(d)) { if (n.startsWith(".")) continue; const f=join(d,n); const rel=relative(ROOT,f).replace(/\\/g,"/"); if (rel.includes("__tests__")) continue; const s=statSync(f); if (s.isDirectory()) walk(f,a); else if (extname(n)===".tsx") a.push(rel); } return a; };
const RE = /export\s+(?:interface|type)\s+\w+Props\s*(?:=\s*)?\{([\s\S]*?)\n\}/g;
const v = [];
for (const rel of walk(SRC)) {
  const src = readFileSync(join(ROOT,rel), "utf8");
  for (const m of src.matchAll(RE)) {
    const members = m[1].split("\n").filter((l) => /^\s*\w+[?:]?:/.test(l)).length;
    if (members > 12) v.push({ file: rel, members });
  }
}
console.log(`[check-component-props-budget] ${ENFORCING?"ENFORCING":"WARN"} — ${v.length} overly-wide prop shapes`);
for (const x of v.slice(0,25)) console.log(`  ${x.file} (${x.members} props)`);
process.exit(ENFORCING && v.length ? 1 : 0);
