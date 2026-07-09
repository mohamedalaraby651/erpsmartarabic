#!/usr/bin/env node
/**
 * design-system-inventory.mjs — Wave 2 discovery.
 * Scans src/** for hardcoded colors, fonts, shadows, and spacing that
 * bypass the token system. Emits JSON + Markdown to
 * scripts/audits/output/wave2-discovery/.
 *
 * Informational at first; enforced by `check-design-system-inventory` at
 * Wave 2 close.
 */
import { readdirSync, readFileSync, statSync, mkdirSync, writeFileSync } from "node:fs";
import { join, extname, relative } from "node:path";

const ROOT = process.cwd();
const SRC = join(ROOT, "src");
const OUT = join(ROOT, "scripts/audits/output/wave2-discovery");

const EXCLUDE_FILES = new Set([
  "src/index.css",
  "src/App.css",
]);
const EXCLUDE_DIRS = ["src/ui/tokens", "src/kernel", "src/platform"];
const EXTENSIONS = new Set([".ts", ".tsx", ".css"]);

const PATTERNS = {
  hexColor: /#[0-9a-fA-F]{3,8}\b/g,
  rgbColor: /\brgba?\(\s*\d/g,
  hslColor: /\bhsla?\(\s*\d/g,
  fontFamily: /font-family\s*:/g,
  boxShadow: /box-shadow\s*:\s*(?!var\()/g,
  arbitraryPx: /\[\d+px\]/g,
};

function walk(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const rel = relative(ROOT, full).replace(/\\/g, "/");
    if (EXCLUDE_DIRS.some((d) => rel === d || rel.startsWith(d + "/"))) continue;
    if (rel.includes("__tests__") || rel.includes("__demo__")) continue;
    const s = statSync(full);
    if (s.isDirectory()) walk(full, acc);
    else if (EXTENSIONS.has(extname(name)) && !EXCLUDE_FILES.has(rel)) acc.push(rel);
  }
  return acc;
}

const findings = { hexColor: [], rgbColor: [], hslColor: [], fontFamily: [], boxShadow: [], arbitraryPx: [] };
for (const rel of walk(SRC)) {
  const src = readFileSync(join(ROOT, rel), "utf8");
  for (const [key, re] of Object.entries(PATTERNS)) {
    const m = src.match(re);
    if (m && m.length) findings[key].push({ file: rel, count: m.length });
  }
}

const totals = Object.fromEntries(Object.entries(findings).map(([k, v]) => [k, v.reduce((a, b) => a + b.count, 0)]));
const report = { generatedAt: new Date().toISOString(), totals, findings };

mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, "design-system-inventory.json"), JSON.stringify(report, null, 2));
const md = [
  "# Design System Inventory (Wave 2)",
  "",
  `Generated: ${report.generatedAt}`,
  "",
  "## Totals",
  ...Object.entries(totals).map(([k, v]) => `- ${k}: ${v}`),
  "",
];
writeFileSync(join(OUT, "design-system-inventory.md"), md.join("\n"));

console.log("[design-system-inventory]", totals);
