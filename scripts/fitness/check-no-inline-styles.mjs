#!/usr/bin/env node
/**
 * check-no-inline-styles.mjs — Wave 2 Closure Phase C (warn mode).
 * Bans `style={{ ... }}` outside src/ui/primitives/** allowlist.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, extname, relative } from "node:path";
const ROOT = process.cwd(), SRC = join(ROOT, "src");
const ENFORCING = process.env.CHECK_NO_INLINE_STYLES_ENFORCE === "1";
const ALLOW = ["src/ui/primitives/"];
const walk = (d, a=[]) => { for (const n of readdirSync(d)) { if (n.startsWith(".")) continue; const f=join(d,n); const rel=relative(ROOT,f).replace(/\\/g,"/"); if (rel.includes("__tests__")) continue; const s=statSync(f); if (s.isDirectory()) walk(f,a); else if (extname(n)===".tsx") a.push(rel); } return a; };
const RE = /style=\{\{/;
const v = [];
for (const rel of walk(SRC)) {
  if (ALLOW.some((p) => rel.startsWith(p))) continue;
  if (RE.test(readFileSync(join(ROOT,rel),"utf8"))) v.push(rel);
}
console.log(`[check-no-inline-styles] ${ENFORCING?"ENFORCING":"WARN"} — ${v.length} files with inline styles`);
for (const x of v.slice(0,25)) console.log(`  ${x}`);
process.exit(ENFORCING && v.length ? 1 : 0);
