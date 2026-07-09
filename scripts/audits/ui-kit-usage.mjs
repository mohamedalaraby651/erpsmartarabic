#!/usr/bin/env node
/**
 * ui-kit-usage.mjs — Wave 2 discovery.
 * Enumerates every file that imports `@/components/ui-kit/**`. Output
 * becomes the allowlist for `check-no-new-ui-kit-imports`.
 */
import { readdirSync, readFileSync, statSync, mkdirSync, writeFileSync } from "node:fs";
import { join, extname, relative } from "node:path";

const ROOT = process.cwd();
const SRC = join(ROOT, "src");
const OUT = join(ROOT, "scripts/audits/output/wave2-discovery");

const IMPORT_RE = /from\s+["']@\/components\/ui-kit(?:\/[^"']*)?["']/g;
const EXTS = new Set([".ts", ".tsx"]);

function walk(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (name === "ui-kit" && full.endsWith("components/ui-kit")) continue;
    const s = statSync(full);
    if (s.isDirectory()) walk(full, acc);
    else if (EXTS.has(extname(name))) acc.push(full);
  }
  return acc;
}

const usages = [];
for (const abs of walk(SRC)) {
  const src = readFileSync(abs, "utf8");
  const matches = src.match(IMPORT_RE);
  if (matches) usages.push({ file: relative(ROOT, abs).replace(/\\/g, "/"), imports: matches.length });
}

mkdirSync(OUT, { recursive: true });
const allowlist = usages.map((u) => u.file).sort();
writeFileSync(join(OUT, "ui-kit-usage.json"), JSON.stringify({ generatedAt: new Date().toISOString(), count: usages.length, files: usages }, null, 2));
writeFileSync(join(OUT, "ui-kit-allowlist.json"), JSON.stringify(allowlist, null, 2));

console.log(`[ui-kit-usage] ${usages.length} files import @/components/ui-kit/**`);
