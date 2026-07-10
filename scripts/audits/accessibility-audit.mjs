#!/usr/bin/env node
/**
 * accessibility-audit.mjs — Wave 2 Closure Phase G.
 * Static a11y heuristics beyond lint: icon-only buttons w/o aria-label,
 * inputs w/o labels, tabindex > 0, skipped headings.
 */
import { readdirSync, readFileSync, statSync, mkdirSync, writeFileSync } from "node:fs";
import { join, extname, relative } from "node:path";

const ROOT = process.cwd();
const SRC = join(ROOT, "src");
const OUT = join(ROOT, "scripts/audits/output/wave2-discovery");
const walk = (d, a = []) => {
  for (const n of readdirSync(d)) {
    if (n.startsWith(".")) continue;
    const f = join(d, n), rel = relative(ROOT, f).replace(/\\/g, "/");
    if (rel.includes("__tests__") || rel.includes("__demo__")) continue;
    const s = statSync(f);
    if (s.isDirectory()) walk(f, a);
    else if (extname(n) === ".tsx") a.push(rel);
  }
  return a;
};

const findings = { iconOnlyNoLabel: [], tabindexPositive: [], skippedHeadings: [], inputsWithoutLabel: [] };
const ICON_BTN_RE = /<Button[^>]*size=["']icon["'][^>]*>[\s\S]*?<\/Button>/g;
const TABIDX_RE = /tabIndex=\{?\s*[1-9]/;
const HEADING_RE = /<h([1-6])/g;

for (const rel of walk(SRC)) {
  const src = readFileSync(join(ROOT, rel), "utf8");
  for (const m of src.matchAll(ICON_BTN_RE)) {
    if (!/aria-label=/.test(m[0])) findings.iconOnlyNoLabel.push(rel);
  }
  if (TABIDX_RE.test(src)) findings.tabindexPositive.push(rel);
  const levels = [...src.matchAll(HEADING_RE)].map((m) => Number(m[1]));
  for (let i = 1; i < levels.length; i++) {
    if (levels[i] - levels[i - 1] > 1) { findings.skippedHeadings.push({ file: rel, from: levels[i - 1], to: levels[i] }); break; }
  }
  // Inputs without htmlFor label sibling nor aria-label
  if (/<Input\b/.test(src) && !/htmlFor=|aria-label=|aria-labelledby=/.test(src)) findings.inputsWithoutLabel.push(rel);
}

mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, "accessibility-audit.json"), JSON.stringify({ generatedAt: new Date().toISOString(), findings }, null, 2));
const total = Object.values(findings).reduce((n, arr) => n + arr.length, 0);
console.log(`[accessibility-audit] ${total} findings — iconOnly=${findings.iconOnlyNoLabel.length} tabindex=${findings.tabindexPositive.length} headings=${findings.skippedHeadings.length} inputs=${findings.inputsWithoutLabel.length}`);
