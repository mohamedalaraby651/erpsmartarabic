#!/usr/bin/env node
/**
 * Fitness — DataGrid domain isolation (Invariant C9).
 *
 * Files under `src/ui/composites/data/**` MUST NOT reference data layer
 * concepts. They handle UI state only.
 */
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../..");
const OUT = resolve(__dirname, "../audits/output/fitness/check-datagrid-domain-isolation.json");
const SCAN = resolve(ROOT, "src/ui/composites/data");

const FORBIDDEN = [
  { pattern: /\buseQuery\b/, why: "useQuery forbidden in data composite" },
  { pattern: /\buseMutation\b/, why: "useMutation forbidden in data composite" },
  { pattern: /\bsupabase\b/i, why: "supabase reference forbidden in data composite" },
  { pattern: /\bfetch\s*\(/, why: "raw fetch forbidden in data composite" },
  { pattern: /\baxios\b/, why: "axios forbidden in data composite" },
  { pattern: /from\s+["']@tanstack\/react-query["']/, why: "react-query import forbidden in data composite" },
];

function walk(dir, out = []) {
  let entries;
  try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const p = resolve(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.tsx?$/.test(e.name)) out.push(p);
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
  fitness: "check-datagrid-domain-isolation",
  baselineVersion: "UX-1",
  scannedFiles: files.length,
  violations,
  pass: violations.length === 0,
};
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(report, null, 2) + "\n");
const status = report.pass ? "PASS" : "FAIL";
console.log(`[fitness:datagrid-domain-isolation] ${status} — scanned=${files.length} violations=${violations.length}`);
if (!report.pass) {
  for (const v of violations) console.log(`  ${v.file} — ${v.why}`);
  process.exit(1);
}
