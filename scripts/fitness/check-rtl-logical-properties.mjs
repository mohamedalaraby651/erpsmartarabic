#!/usr/bin/env node
/**
 * Fitness — RTL logical properties only.
 *
 * Inside `src/ui/primitives/**` (excluding `_internal/`, `__tests__/`,
 * `__demo__/`), physical-direction CSS is forbidden. Use logical
 * properties instead:
 *
 *   ml-* / mr-*    →  ms-* / me-*
 *   pl-* / pr-*    →  ps-* / pe-*
 *   left-* / right-* → start-* / end-*
 *   text-left / text-right → text-start / text-end
 *   rounded-l-* / rounded-r-* → rounded-s-* / rounded-e-*
 *   border-l-* / border-r-* → border-s-* / border-e-*
 *
 * The Switch primitive's `ltr:` / `rtl:` variants for `translate-x-*` are
 * permitted because Tailwind has no logical equivalent for transforms.
 */
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../..");
const OUT = resolve(
  __dirname,
  "../audits/output/fitness/check-rtl-logical-properties.json",
);
const SCAN = resolve(ROOT, "src/ui/primitives");

// Forbidden patterns (matched after stripping the allowed `ltr:`/`rtl:` prefixes).
const PHYSICAL = [
  { pattern: /(?<![\w-])ml-\d/, why: "use ms-* instead of ml-*" },
  { pattern: /(?<![\w-])mr-\d/, why: "use me-* instead of mr-*" },
  { pattern: /(?<![\w-])pl-\d/, why: "use ps-* instead of pl-*" },
  { pattern: /(?<![\w-])pr-\d/, why: "use pe-* instead of pr-*" },
  { pattern: /(?<![\w-])left-\d/, why: "use start-* instead of left-*" },
  { pattern: /(?<![\w-])right-\d/, why: "use end-* instead of right-*" },
  { pattern: /text-left\b/, why: "use text-start instead of text-left" },
  { pattern: /text-right\b/, why: "use text-end instead of text-right" },
  { pattern: /rounded-l-/, why: "use rounded-s-* instead of rounded-l-*" },
  { pattern: /rounded-r-/, why: "use rounded-e-* instead of rounded-r-*" },
  { pattern: /border-l-\d/, why: "use border-s-* instead of border-l-*" },
  { pattern: /border-r-\d/, why: "use border-e-* instead of border-r-*" },
  { pattern: /\bleft\s*:/, why: "use inset-inline-start instead of left:" },
  { pattern: /\bright\s*:/, why: "use inset-inline-end instead of right:" },
];

function walk(dir, out = []) {
  for (const e of readdirSync(dir, { withFileTypes: true }).sort((a, b) =>
    a.name.localeCompare(b.name),
  )) {
    if (e.isDirectory()) {
      if (["_internal", "__tests__", "__demo__"].includes(e.name)) continue;
      walk(resolve(dir, e.name), out);
    } else if (/\.(tsx?|css)$/.test(e.name) && !e.name.endsWith(".d.ts")) {
      out.push(resolve(dir, e.name));
    }
  }
  return out;
}

const files = walk(SCAN);
const violations = [];
for (const f of files) {
  const rel = relative(ROOT, f).split(sep).join("/");
  const raw = readFileSync(f, "utf8");
  const lines = raw.split("\n");
  lines.forEach((line, idx) => {
    // Strip allowed RTL/LTR variant prefixes before scanning so
    // `ltr:translate-x-5` / `rtl:-translate-x-5` etc. don't trip us up.
    const scrub = line
      .replace(/\bltr:[^\s"`']+/g, " ")
      .replace(/\brtl:[^\s"`']+/g, " ");
    for (const rule of PHYSICAL) {
      if (rule.pattern.test(scrub)) {
        violations.push({ file: rel, line: idx + 1, why: rule.why });
      }
    }
  });
}
violations.sort(
  (a, b) =>
    a.file.localeCompare(b.file) || a.line - b.line || a.why.localeCompare(b.why),
);

const report = {
  schemaVersion: 1,
  fitness: "check-rtl-logical-properties",
  baselineVersion: "UX-1",
  scannedFiles: files.length,
  violations,
  pass: violations.length === 0,
};
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(report, null, 2) + "\n");
const status = report.pass ? "PASS" : "FAIL";
console.log(
  `[fitness:rtl-logical-properties] ${status} — scanned=${files.length} violations=${violations.length}`,
);
if (!report.pass) {
  for (const v of violations) console.log(`  ${v.file}:${v.line} — ${v.why}`);
  process.exit(1);
}
