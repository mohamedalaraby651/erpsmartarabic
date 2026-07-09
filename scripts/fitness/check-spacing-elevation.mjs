#!/usr/bin/env node
/**
 * check-spacing-elevation.mjs — Wave 2 fitness (warn mode).
 * No hardcoded `box-shadow: ...` (must reference `var(--shadow-*)`) and
 * no arbitrary Tailwind pixel spacing like `p-[13px]`.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, extname, relative } from "node:path";

const ROOT = process.cwd();
const SRC = join(ROOT, "src");
const ENFORCING = process.env.CHECK_SPACING_ELEVATION_ENFORCE === "1";
const EXCLUDE_FILES = new Set(["src/index.css"]);
const EXCLUDE_DIRS = ["src/ui/tokens", "src/kernel", "src/platform"];
const EXTS = new Set([".ts", ".tsx", ".css"]);
const RE_BOX = /box-shadow\s*:\s*(?!var\()[^;]/i;
const RE_ARB_PX = /\b[pm][trblxy]?-\[\d+px\]/;

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
  if (RE_BOX.test(src)) violations.push({ file: rel, kind: "box-shadow" });
  if (RE_ARB_PX.test(src)) violations.push({ file: rel, kind: "arbitrary-px-spacing" });
}

const mode = ENFORCING ? "ENFORCING" : "WARN";
console.log(`[check-spacing-elevation] ${mode} — ${violations.length} violations`);
for (const v of violations.slice(0, 25)) console.log(`  ${v.file} (${v.kind})`);
process.exit(ENFORCING && violations.length ? 1 : 0);
