#!/usr/bin/env node
/**
 * check-css-modules-scope.mjs — Wave 2 Closure Phase C (warn mode).
 * *.module.css allowed only under src/ui/**.
 */
import { readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
const ROOT = process.cwd(), SRC = join(ROOT, "src");
const ENFORCING = process.env.CHECK_CSS_MODULES_ENFORCE === "1";
const walk = (d, a=[]) => { for (const n of readdirSync(d)) { if (n.startsWith(".")) continue; const f=join(d,n); const s=statSync(f); if (s.isDirectory()) walk(f,a); else a.push(relative(ROOT,f).replace(/\\/g,"/")); } return a; };
const v = walk(SRC).filter((r) => r.endsWith(".module.css") && !r.startsWith("src/ui/"));
console.log(`[check-css-modules-scope] ${ENFORCING?"ENFORCING":"WARN"} — ${v.length} module.css outside src/ui/`);
for (const x of v.slice(0,25)) console.log(`  ${x}`);
process.exit(ENFORCING && v.length ? 1 : 0);
