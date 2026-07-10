#!/usr/bin/env node
/**
 * check-icon-source.mjs — Wave 2 Closure Phase C (warn mode).
 * Icons must come from `lucide-react`. Other icon libs are forbidden.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, extname, relative } from "node:path";
const ROOT = process.cwd(), SRC = join(ROOT, "src");
const ENFORCING = process.env.CHECK_ICON_SOURCE_ENFORCE === "1";
const walk = (d, a=[]) => { for (const n of readdirSync(d)) { if (n.startsWith(".")) continue; const f=join(d,n); const rel=relative(ROOT,f).replace(/\\/g,"/"); const s=statSync(f); if (s.isDirectory()) walk(f,a); else if ([".ts",".tsx"].includes(extname(n))) a.push(rel); } return a; };
const BANNED = [/from ["']@heroicons/, /from ["']react-icons/, /from ["']@radix-ui\/react-icons/, /from ["']@tabler\/icons/];
const v = [];
for (const rel of walk(SRC)) {
  const src = readFileSync(join(ROOT,rel), "utf8");
  for (const re of BANNED) if (re.test(src)) { v.push(rel); break; }
}
console.log(`[check-icon-source] ${ENFORCING?"ENFORCING":"WARN"} — ${v.length} files using non-lucide icons`);
for (const x of v.slice(0,25)) console.log(`  ${x}`);
process.exit(ENFORCING && v.length ? 1 : 0);
