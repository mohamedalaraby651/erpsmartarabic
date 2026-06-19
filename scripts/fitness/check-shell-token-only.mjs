#!/usr/bin/env node
/**
 * Fitness function — Shell token-only styling.
 *
 * Scans `src/ui/layout/**` + `src/ui/providers/**` for hardcoded color and
 * radius values that bypass the design-token public API.
 *
 * Heuristics (intentionally conservative to keep noise low):
 *   - Forbidden literal patterns:
 *       #[0-9a-fA-F]{3,8}  (hex)
 *       hsl( | hsla(
 *       rgb( | rgba(
 *       font-family:
 *   - Forbidden Tailwind arbitrary tokens:
 *       text-\[(#|hsl|rgb)
 *       bg-\[(#|hsl|rgb)
 *       border-\[(#|hsl|rgb)
 *       rounded-\[\d
 *   - Forbidden tailwind palette utilities:
 *       text-(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|
 *             green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|
 *             pink|rose|white|black)-
 *
 * Allow-list: `text-(primary|secondary|destructive|muted|accent|popover|
 *              card|background|foreground|success|warning|sidebar|ring|
 *              input|border)` and corresponding `bg-` / `border-`.
 */
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../..");
const OUT = resolve(__dirname, "../audits/output/fitness/check-shell-token-only.json");

const SCAN_DIRS = ["src/ui/layout", "src/ui/providers"];

const FORBIDDEN_PATTERNS = [
  { pattern: /#[0-9a-fA-F]{3,8}\b/g, why: "hex color literal" },
  { pattern: /\bhsla?\s*\(/g, why: "hsl/hsla color literal" },
  { pattern: /\brgba?\s*\(/g, why: "rgb/rgba color literal" },
  { pattern: /font-family\s*:/g, why: "hardcoded font-family" },
  { pattern: /(?:text|bg|border)-\[(?:#|hsl|rgb)/g, why: "arbitrary tailwind color" },
  { pattern: /rounded-\[\d/g, why: "arbitrary tailwind radius" },
  {
    pattern:
      /\b(?:text|bg|border)-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3}\b/g,
    why: "tailwind palette utility (use semantic token)",
  },
];

function walk(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true }).sort((a, b) =>
    a.name.localeCompare(b.name)
  )) {
    const p = resolve(dir, entry.name);
    if (entry.isDirectory()) walk(p, out);
    else if (/\.(tsx?|mts|cts)$/.test(entry.name) && !entry.name.endsWith(".d.ts"))
      out.push(p);
  }
  return out;
}

const files = SCAN_DIRS.flatMap((d) => walk(resolve(ROOT, d)));
const violations = [];
for (const file of files) {
  const rel = relative(ROOT, file).split(sep).join("/");
  const code = readFileSync(file, "utf8");
  for (const rule of FORBIDDEN_PATTERNS) {
    const matches = code.match(rule.pattern);
    if (matches) {
      // De-dupe per file+rule to keep output compact.
      violations.push({ file: rel, why: rule.why, hits: matches.length });
    }
  }
}

violations.sort(
  (a, b) => a.file.localeCompare(b.file) || a.why.localeCompare(b.why)
);

const report = {
  schemaVersion: 1,
  fitness: "check-shell-token-only",
  baselineVersion: "UX-1",
  scannedFiles: files.length,
  violations,
  pass: violations.length === 0,
};

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(report, null, 2) + "\n");

const status = report.pass ? "PASS" : "FAIL";
console.log(
  `[fitness:shell-token-only] ${status} — scanned=${files.length} violations=${violations.length}`
);
if (!report.pass) {
  for (const v of violations) console.log(`  ${v.file} — ${v.why} (x${v.hits})`);
  process.exit(1);
}
