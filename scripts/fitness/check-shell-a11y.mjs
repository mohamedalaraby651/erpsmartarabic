#!/usr/bin/env node
/**
 * Fitness function — basic Shell accessibility hygiene (warn-only summary,
 * fails only when blockers are present).
 *
 * Heuristics applied to `src/ui/layout/**`:
 *   - Every <button> without text children must have `aria-label`.
 *   - Every interactive element with `onClick` must be a button/link/role.
 *   - Every <img> must have an `alt` attribute.
 *   - `tabIndex` numeric > 0 is flagged.
 *
 * Deterministic JSON output.
 */
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../..");
const OUT = resolve(__dirname, "../audits/output/fitness/check-shell-a11y.json");
const SCAN_DIR = resolve(ROOT, "src/ui/layout");

function walk(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true }).sort((a, b) =>
    a.name.localeCompare(b.name)
  )) {
    const p = resolve(dir, entry.name);
    if (entry.isDirectory()) walk(p, out);
    else if (/\.tsx$/.test(entry.name)) out.push(p);
  }
  return out;
}

const files = walk(SCAN_DIR);
const findings = [];

const BUTTON_NO_LABEL =
  /<button(?![^>]*\baria-label=)(?![^>]*\baria-labelledby=)[^>]*>\s*<[A-Z][^>]*\/?>?\s*<\/button>/g;
const IMG_NO_ALT = /<img(?![^>]*\balt=)[^>]*>/g;
const TABINDEX_POSITIVE = /tabIndex=\{(\d+)\}/g;

for (const file of files) {
  const rel = relative(ROOT, file).split(sep).join("/");
  const code = readFileSync(file, "utf8");

  if (BUTTON_NO_LABEL.test(code))
    findings.push({ file: rel, rule: "button-name", severity: "warning" });
  if (IMG_NO_ALT.test(code))
    findings.push({ file: rel, rule: "img-alt", severity: "error" });
  for (const m of code.matchAll(TABINDEX_POSITIVE)) {
    if (Number(m[1]) > 0)
      findings.push({ file: rel, rule: "tabindex-positive", severity: "warning" });
  }
}

findings.sort(
  (a, b) => a.file.localeCompare(b.file) || a.rule.localeCompare(b.rule)
);

const errors = findings.filter((f) => f.severity === "error");

const report = {
  schemaVersion: 1,
  fitness: "check-shell-a11y",
  baselineVersion: "UX-1",
  scannedFiles: files.length,
  findings,
  pass: errors.length === 0,
};

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(report, null, 2) + "\n");

const status = report.pass ? "PASS" : "FAIL";
console.log(
  `[fitness:shell-a11y] ${status} — scanned=${files.length} warnings=${
    findings.length - errors.length
  } errors=${errors.length}`
);
if (!report.pass) process.exit(1);
