#!/usr/bin/env node
/**
 * Fitness — Contract purity (Invariant C8).
 *
 * Files under `src/ui/contracts/**` MUST be compile-time only. No React,
 * no Zod, no runtime modules. The only allowed imports are type-only
 * imports from sibling contract files.
 */
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../..");
const OUT = resolve(__dirname, "../audits/output/fitness/check-contract-purity.json");
const SCAN = resolve(ROOT, "src/ui/contracts");

function walk(dir, out = []) {
  let entries;
  try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const p = resolve(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.tsx?$/.test(e.name) && !e.name.endsWith(".d.ts")) out.push(p);
  }
  return out;
}

const files = walk(SCAN);
const violations = [];
const importRe = /^\s*(?:import|export)\s+(?!type\b)[^;]*?from\s+["']([^"']+)["']/gm;

for (const f of files) {
  const rel = relative(ROOT, f).split(sep).join("/");
  const code = readFileSync(f, "utf8");

  if (/\.tsx$/.test(f)) {
    violations.push({ file: rel, why: "contracts must be .ts, never .tsx (no JSX runtime)" });
  }
  if (/from\s+["']react["']/.test(code)) {
    violations.push({ file: rel, why: "React import forbidden in contracts" });
  }
  if (/from\s+["']zod["']/.test(code)) {
    violations.push({ file: rel, why: "zod import forbidden in contracts (Invariant C8)" });
  }

  let m;
  while ((m = importRe.exec(code)) !== null) {
    const spec = m[1];
    // Allowed: relative type-only? We required `import type` above for non-type.
    violations.push({
      file: rel,
      why: `runtime import "${spec}" forbidden — use "import type" only`,
    });
  }
}
violations.sort((a, b) => a.file.localeCompare(b.file) || a.why.localeCompare(b.why));

const report = {
  schemaVersion: 1,
  fitness: "check-contract-purity",
  baselineVersion: "UX-1",
  scannedFiles: files.length,
  violations,
  pass: violations.length === 0,
};
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(report, null, 2) + "\n");
const status = report.pass ? "PASS" : "FAIL";
console.log(`[fitness:contract-purity] ${status} — scanned=${files.length} violations=${violations.length}`);
if (!report.pass) {
  for (const v of violations) console.log(`  ${v.file} — ${v.why}`);
  process.exit(1);
}
