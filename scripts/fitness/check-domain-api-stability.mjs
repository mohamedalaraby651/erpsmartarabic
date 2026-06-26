#!/usr/bin/env node
/**
 * Fitness — Domain API Stability (ADR-0011 + Wave 6 A3).
 *
 * Outside-callers MUST import the finance bounded context exclusively from
 * `@/domain/finance`. Deep imports such as
 *   import { Invoice } from "@/domain/finance/invoice/Invoice"
 * are forbidden because they tear holes in the published surface.
 *
 * Allow-list (the only valid forms outside `src/domain/finance/**`):
 *   - `from "@/domain/finance"`
 *   - `from "@/domain/finance/index"` (vacuous form)
 *
 * Inside `src/domain/finance/**` deep imports are permitted (internal seams).
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { walk } from "./_lib/walk.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../..");
const SRC = resolve(ROOT, "src");
const FINANCE = "src/domain/finance/";
const OUT = resolve(__dirname, "../audits/output/fitness/check-domain-api-stability.json");
const IMPORT_RE = /from\s+["']([^"']+)["']/g;

const violations = [];
let scannedFiles = 0;
let externalImports = 0;

for (const f of walk(SRC)) {
  const rel = relative(ROOT, f).split(sep).join("/");
  if (rel.startsWith(FINANCE)) continue; // internal
  scannedFiles++;
  const code = readFileSync(f, "utf8");
  for (const m of code.matchAll(IMPORT_RE)) {
    const spec = m[1];
    if (!spec.startsWith("@/domain/finance")) continue;
    externalImports++;
    if (spec === "@/domain/finance" || spec === "@/domain/finance/index") continue;
    violations.push({
      file: rel,
      import: spec,
      why: "Deep import of finance domain — must use '@/domain/finance' only",
    });
  }
}

violations.sort(
  (a, b) => a.file.localeCompare(b.file) || a.import.localeCompare(b.import),
);

const report = {
  schemaVersion: 1,
  fitness: "check-domain-api-stability",
  adr: "ADR-0011 (Wave 6 A3)",
  scannedFiles,
  externalImports,
  violations,
  pass: violations.length === 0,
};
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(report, null, 2) + "\n");
const status = report.pass ? "PASS" : "FAIL";
console.log(
  `[fitness:domain-api-stability] ${status} — scanned=${scannedFiles} ext-imports=${externalImports} violations=${violations.length}`,
);
if (!report.pass) {
  for (const v of violations) console.log(`  ${v.file} — ${v.why} (${v.import})`);
  process.exit(1);
}
