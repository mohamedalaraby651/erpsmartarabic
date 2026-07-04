#!/usr/bin/env node
/**
 * check-no-new-adaptiveshell-imports — UX3A Wave 1, Invariants #4 & #5.
 * Only src/platform/shell/** and src/components/layout/AdaptiveShell.tsx
 * itself may reference AdaptiveShell. AppLayout must import PlatformShell.
 */
import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { join, resolve, dirname, extname, relative } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..", "..");
const SRC = join(ROOT, "src");
const EXT = new Set([".ts", ".tsx", ".js", ".jsx"]);

function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name.startsWith(".")) continue;
    const abs = join(dir, name);
    const st = statSync(abs);
    if (st.isDirectory()) walk(abs, out);
    else if (EXT.has(extname(name))) out.push(abs);
  }
  return out;
}

const ADAPTIVE_RE = /from\s+["']([^"']*AdaptiveShell)["']/;
const files = walk(SRC);
const violations = [];

for (const abs of files) {
  const rel = relative(ROOT, abs).split("\\").join("/");
  if (rel.endsWith("/AdaptiveShell.tsx")) continue;
  if (rel.startsWith("src/platform/shell/")) continue;
  const src = readFileSync(abs, "utf8");
  if (ADAPTIVE_RE.test(src)) {
    violations.push(`${rel} :: imports AdaptiveShell (forbidden outside src/platform/shell/**)`);
  }
}

const tag = "[fitness:check-no-new-adaptiveshell-imports]";
if (violations.length === 0) {
  console.log(`${tag} 0 violations`);
  process.exit(0);
}
console.log(`${tag} ${violations.length} violation(s):`);
for (const v of violations) console.log(`  ${v}`);
process.exit(1);
