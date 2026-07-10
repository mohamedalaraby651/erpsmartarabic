#!/usr/bin/env node
/**
 * check-no-any-in-ui.mjs — Wave 2 Closure Phase C (warn mode).
 * Bans `: any` and `<any>` in src/ui/** and src/components/**.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, extname, relative } from "node:path";
const ROOT = process.cwd();
const ENFORCING = process.env.CHECK_NO_ANY_UI_ENFORCE === "1";
const SCOPES = [join(ROOT, "src/ui"), join(ROOT, "src/components")];
const walk = (d, a=[]) => { for (const n of readdirSync(d)) { if (n.startsWith(".")) continue; const f=join(d,n); const rel=relative(ROOT,f).replace(/\\/g,"/"); if (rel.includes("__tests__")) continue; const s=statSync(f); if (s.isDirectory()) walk(f,a); else if ([".ts",".tsx"].includes(extname(n))) a.push(rel); } return a; };
const RE_A = /:\s*any\b/;
const RE_B = /<any>/;
const v = [];
for (const scope of SCOPES) {
  for (const rel of walk(scope)) {
    const s = readFileSync(join(ROOT,rel), "utf8");
    if (RE_A.test(s) || RE_B.test(s)) v.push(rel);
  }
}
console.log(`[check-no-any-in-ui] ${ENFORCING?"ENFORCING":"WARN"} — ${v.length} files with any`);
for (const x of v.slice(0,25)) console.log(`  ${x}`);
process.exit(ENFORCING && v.length ? 1 : 0);
