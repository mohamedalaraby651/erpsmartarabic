#!/usr/bin/env node
/**
 * Fitness — Repository Failure Taxonomy (ADR-0010 + Wave 6).
 *
 * Every repository port in `src/domain/**` MUST use the canonical
 * `RepositoryFailure` union from `@/shared-kernel`. No local
 * re-definition, no ad-hoc error shape.
 *
 * Heuristic:
 *  - Scan files under `src/domain/**` whose path contains `/ports/` AND
 *    whose filename matches `*Repository.ts` or `*Repo.ts`.
 *  - Require: at least one import of `RepositoryFailure` from
 *    `@/shared-kernel`.
 *  - Forbid: any local `type RepositoryFailure` / `interface
 *    RepositoryFailure` declaration.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { walk } from "./_lib/walk.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../..");
const DOMAIN = resolve(ROOT, "src/domain");
const OUT = resolve(__dirname, "../audits/output/fitness/check-repository-failure-taxonomy.json");
const TEST_RE = /\/(__tests__|__integration__|__mocks__)\//;
const REPO_FILE_RE = /\/ports\/.*Repo(?:sitory)?\.ts$/;

const violations = [];
let scannedFiles = 0;

for (const f of walk(DOMAIN)) {
  const rel = relative(ROOT, f).split(sep).join("/");
  if (TEST_RE.test("/" + rel)) continue;
  if (!REPO_FILE_RE.test("/" + rel)) continue;
  scannedFiles++;
  const code = readFileSync(f, "utf8");

  const importsCanonical =
    /from\s+["']@\/shared-kernel["']/.test(code) &&
    /\bRepositoryFailure\b/.test(code);
  if (!importsCanonical) {
    violations.push({
      file: rel,
      why: "repository port must import RepositoryFailure from '@/shared-kernel'",
    });
  }

  if (/\b(?:type|interface)\s+RepositoryFailure\b/.test(code)) {
    violations.push({
      file: rel,
      why: "local re-definition of RepositoryFailure is forbidden",
    });
  }
}

const report = {
  schemaVersion: 1,
  fitness: "check-repository-failure-taxonomy",
  adr: "ADR-0010",
  scannedFiles,
  violations,
  pass: violations.length === 0,
};
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(report, null, 2) + "\n");
console.log(
  `[fitness:repository-failure-taxonomy] ${report.pass ? "PASS" : "FAIL"} — scanned=${scannedFiles} violations=${violations.length}`,
);
if (!report.pass) {
  for (const v of violations) console.log(`  ${v.file} — ${v.why}`);
  process.exit(1);
}
