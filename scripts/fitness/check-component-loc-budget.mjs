#!/usr/bin/env node
/**
 * check-component-loc-budget.mjs — Wave 2 Closure Phase C (warn mode).
 * Primitives ≤ 250 LOC, composites ≤ 400, feature ≤ 600.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, extname, relative } from "node:path";
const ROOT = process.cwd(), SRC = join(ROOT, "src");
const ENFORCING = process.env.CHECK_COMPONENT_LOC_ENFORCE === "1";
const budget = (rel) => rel.startsWith("src/ui/primitives/") ? 250 : rel.startsWith("src/ui/composites/") ? 400 : 600;
const walk = (d, a=[]) => { for (const n of readdirSync(d)) { if (n.startsWith(".")) continue; const f=join(d,n); const rel=relative(ROOT,f).replace(/\\/g,"/"); if (rel.includes("__tests__")||rel.includes("__demo__")) continue; const s=statSync(f); if (s.isDirectory()) walk(f,a); else if (extname(n)===".tsx") a.push(rel); } return a; };
const v = [];
for (const rel of walk(SRC)) {
  const lines = readFileSync(join(ROOT,rel), "utf8").split("\n").length;
  const b = budget(rel);
  if (lines > b) v.push({ file: rel, lines, budget: b });
}
console.log(`[check-component-loc-budget] ${ENFORCING?"ENFORCING":"WARN"} — ${v.length} components over budget`);
for (const x of v.slice(0,25)) console.log(`  ${x.file} ${x.lines}/${x.budget}`);
process.exit(ENFORCING && v.length ? 1 : 0);
