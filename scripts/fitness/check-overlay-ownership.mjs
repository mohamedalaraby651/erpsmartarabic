#!/usr/bin/env node
/**
 * Fitness — Overlay ownership (Invariant C11).
 *
 * Composites must not implement overlay runtime: no createPortal, no
 * focus-trap libraries, no Dialog.Portal usage. FormDialog must remain a
 * declarative spec emitter — i.e. zero portal/render-tree side effects.
 */
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../..");
const OUT = resolve(__dirname, "../audits/output/fitness/check-overlay-ownership.json");
const SCAN = resolve(ROOT, "src/ui/composites");

const FORBIDDEN = [
  { pattern: /createPortal\s*\(/, why: "createPortal forbidden in composite (Shell owns portals)" },
  { pattern: /from\s+["']react-dom["']/, why: "react-dom import forbidden in composite" },
  { pattern: /FocusTrap|useFocusTrap|focus-trap/, why: "focus trap implementation forbidden in composite" },
  { pattern: /Dialog\.Portal|DialogPortal\b/, why: "DialogPortal usage forbidden in composite (Shell-only)" },
  { pattern: /from\s+["']@radix-ui\/react-dialog["']/, why: "direct radix dialog import forbidden in composite" },
];

function walk(dir, out = []) {
  let entries;
  try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const p = resolve(dir, e.name);
    if (e.isDirectory()) {
      if (["__tests__", "__demo__"].includes(e.name)) continue;
      walk(p, out);
    } else if (/\.tsx?$/.test(e.name)) out.push(p);
  }
  return out;
}

const files = walk(SCAN);
const violations = [];
for (const f of files) {
  const rel = relative(ROOT, f).split(sep).join("/");
  const code = readFileSync(f, "utf8");
  for (const rule of FORBIDDEN) {
    if (rule.pattern.test(code)) violations.push({ file: rel, why: rule.why });
  }
}
violations.sort((a, b) => a.file.localeCompare(b.file) || a.why.localeCompare(b.why));

const report = {
  schemaVersion: 1,
  fitness: "check-overlay-ownership",
  baselineVersion: "UX-1",
  scannedFiles: files.length,
  violations,
  pass: violations.length === 0,
};
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(report, null, 2) + "\n");
const status = report.pass ? "PASS" : "FAIL";
console.log(`[fitness:overlay-ownership] ${status} — scanned=${files.length} violations=${violations.length}`);
if (!report.pass) {
  for (const v of violations) console.log(`  ${v.file} — ${v.why}`);
  process.exit(1);
}
