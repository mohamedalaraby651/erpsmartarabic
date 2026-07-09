#!/usr/bin/env node
/**
 * check-ui-api-uniformity.mjs — Wave 2.5 fitness (warn mode).
 * Enforces the UI API Uniformity Charter (ADR-0029) across Primitives,
 * Composites, and Layout.
 *
 * Warn mode by default; flips to enforcing at Wave 2.5 close.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, extname, relative } from "node:path";

const ROOT = process.cwd();
const ENFORCING = process.env.CHECK_UI_API_UNIFORMITY_ENFORCE === "1";
const LAYERS = ["src/ui/primitives", "src/ui/composites", "src/ui/layout"];
const EXTS = new Set([".tsx"]);

function walk(dir, acc = []) {
  try {
    for (const name of readdirSync(dir)) {
      if (name.startsWith(".")) continue;
      const full = join(dir, name);
      const s = statSync(full);
      if (s.isDirectory()) {
        if (name === "__tests__" || name === "__demo__" || name === "__fixtures__" || name === "_internal") continue;
        walk(full, acc);
      } else if (EXTS.has(extname(name))) acc.push(full);
    }
  } catch { /* ignore */ }
  return acc;
}

const violations = [];
for (const layer of LAYERS) {
  for (const abs of walk(join(ROOT, layer))) {
    const rel = relative(ROOT, abs).replace(/\\/g, "/");
    const src = readFileSync(abs, "utf8");
    const isForwardRef = /React\.forwardRef|forwardRef\s*[<(]/.test(src);
    const hasDisplayName = /\.displayName\s*=\s*["']/.test(src);
    const hasCanonicalTag = /@canonicalState\s+Canonical/.test(src);
    const hasAny = /:\s*any\b/.test(src);
    const acceptsClassName = /className\s*[?:]/.test(src);

    const issues = [];
    if (isForwardRef && !hasDisplayName) issues.push("missing displayName on forwardRef");
    if (!hasCanonicalTag) issues.push("missing @canonicalState JSDoc tag");
    if (hasAny) issues.push("`any` in exported types");
    if (!acceptsClassName) issues.push("does not accept `className` prop");
    if (issues.length) violations.push({ file: rel, issues });
  }
}

const mode = ENFORCING ? "ENFORCING" : "WARN";
console.log(`[check-ui-api-uniformity] ${mode} — ${violations.length} components with issues`);
for (const v of violations.slice(0, 40)) console.log(`  ${v.file}: ${v.issues.join(", ")}`);
if (violations.length > 40) console.log(`  … (${violations.length - 40} more)`);
process.exit(ENFORCING && violations.length ? 1 : 0);
