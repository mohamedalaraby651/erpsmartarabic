#!/usr/bin/env node
/**
 * Fitness — UI / Infrastructure Isolation.
 *
 * Domain and Application layers MUST NOT import UI / infrastructure
 * modules.  Inverse: UI and Infrastructure may import from domain/index
 * only (covered by `check-domain-api-stability`).
 *
 * Scope: `src/domain/**` and `src/application/**` (application is empty
 * today — vacuous-pass for that side).
 *
 * Forbidden specifiers anywhere in scope:
 *   - any `react*`, `react-dom*`, `react-router*`
 *   - any `@supabase/*`
 *   - any relative path containing `/ui/` or `/infrastructure/`
 *   - any absolute path under `@/ui/` or `@/infrastructure/`
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { walk } from "./_lib/walk.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../..");
const SCOPES = ["src/domain", "src/application"]
  .map((p) => resolve(ROOT, p))
  .filter((p) => existsSync(p));
const OUT = resolve(__dirname, "../audits/output/fitness/check-ui-infrastructure-isolation.json");
const TEST_RE = /\/(__tests__|__integration__|__mocks__)\//;
const IMPORT_RE = /from\s+["']([^"']+)["']/g;

const FORBIDDEN = [
  { re: /^react(?:-dom|-router[^/]*)?(?:\/.+)?$/, why: "react/* import" },
  { re: /^@supabase\//, why: "@supabase/* import" },
  { re: /\/ui\//, why: "import crosses into ui/" },
  { re: /\/infrastructure\//, why: "import crosses into infrastructure/" },
  { re: /^@\/ui\//, why: "absolute import @/ui/*" },
  { re: /^@\/infrastructure\//, why: "absolute import @/infrastructure/*" },
];

const violations = [];
let scannedFiles = 0;

for (const scope of SCOPES) {
  for (const f of walk(scope)) {
    const rel = relative(ROOT, f).split(sep).join("/");
    if (TEST_RE.test("/" + rel)) continue;
    scannedFiles++;
    const code = readFileSync(f, "utf8");
    for (const m of code.matchAll(IMPORT_RE)) {
      const spec = m[1];
      for (const { re, why } of FORBIDDEN) {
        if (re.test(spec)) violations.push({ file: rel, import: spec, why });
      }
    }
  }
}

const report = {
  schemaVersion: 1,
  fitness: "check-ui-infrastructure-isolation",
  adr: "ADR-0011",
  scannedFiles,
  violations,
  pass: violations.length === 0,
};
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(report, null, 2) + "\n");
console.log(
  `[fitness:ui-infrastructure-isolation] ${report.pass ? "PASS" : "FAIL"} — scanned=${scannedFiles} violations=${violations.length}`,
);
if (!report.pass) {
  for (const v of violations) console.log(`  ${v.file} — ${v.why} (${v.import})`);
  process.exit(1);
}
