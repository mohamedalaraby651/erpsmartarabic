#!/usr/bin/env node
/**
 * check-typography-tokens.mjs — Wave 2 fitness (warn mode).
 * No hardcoded `font-family` outside the token layer / index.css.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, extname, relative } from "node:path";

const ROOT = process.cwd();
const SRC = join(ROOT, "src");
const ENFORCING = process.env.CHECK_TYPOGRAPHY_TOKENS_ENFORCE === "1";
const EXCLUDE_FILES = new Set(["src/index.css", "src/main.tsx"]);
const EXCLUDE_DIRS = ["src/ui/tokens", "src/kernel", "src/platform", "src/lib/pdf", "src/components/print"];
const EXTS = new Set([".ts", ".tsx", ".css"]);
const RE = /font-family\s*:/i;

function walk(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    if (name.startsWith(".")) continue;
    const full = join(dir, name);
    const rel = relative(ROOT, full).replace(/\\/g, "/");
    if (EXCLUDE_DIRS.some((d) => rel === d || rel.startsWith(d + "/"))) continue;
    if (rel.includes("__tests__") || rel.includes("__demo__")) continue;
    const s = statSync(full);
    if (s.isDirectory()) walk(full, acc);
    else if (EXTS.has(extname(name)) && !EXCLUDE_FILES.has(rel)) acc.push(rel);
  }
  return acc;
}

const violations = [];
for (const rel of walk(SRC)) {
  const src = readFileSync(join(ROOT, rel), "utf8");
  if (RE.test(src)) violations.push(rel);
}

const mode = ENFORCING ? "ENFORCING" : "WARN";
console.log(`[check-typography-tokens] ${mode} — ${violations.length} files with hardcoded font-family`);
for (const v of violations.slice(0, 25)) console.log(`  ${v}`);
process.exit(ENFORCING && violations.length ? 1 : 0);
