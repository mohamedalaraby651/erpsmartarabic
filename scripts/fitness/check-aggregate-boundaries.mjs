#!/usr/bin/env node
/**
 * Fitness — Aggregate Boundaries (ADR-0011 §1, Wave 5).
 *
 * Each subdirectory of `src/domain/<context>/` (except `shared/`) is a
 * SEPARATE aggregate. Files inside aggregate A MUST NOT import from
 * aggregate B's directory: cross-aggregate communication happens via
 * domain events / application orchestration, never via deep imports.
 *
 * Allowed:
 *   - sibling imports inside the same aggregate
 *   - imports from `../shared/*` (or `@/domain/<ctx>/shared/*`) value objects
 *   - imports from `@/shared-kernel`
 *
 * Forbidden:
 *   - relative path crossing into another aggregate (`../<otherAggregate>/`)
 *   - absolute path into another aggregate (`@/domain/<ctx>/<otherAggregate>/`)
 *
 * Tests under `__tests__/` are ignored.
 */
import { readFileSync, readdirSync, writeFileSync, mkdirSync, statSync } from "node:fs";
import { dirname, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { walk } from "./_lib/walk.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../..");
const DOMAIN_ROOT = resolve(ROOT, "src/domain");
const OUT = resolve(
  __dirname,
  "../audits/output/fitness/check-aggregate-boundaries.json",
);

const TEST_RE = /\/(__tests__|__integration__|__mocks__)\//;
const IMPORT_RE = /from\s+["']([^"']+)["']/g;

function listContexts(root) {
  try {
    return readdirSync(root, { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .map((e) => e.name);
  } catch {
    return [];
  }
}

function listAggregates(ctxDir) {
  try {
    return readdirSync(ctxDir, { withFileTypes: true })
      .filter((e) => e.isDirectory() && e.name !== "shared")
      .map((e) => e.name);
  } catch {
    return [];
  }
}

const violations = [];
let scannedFiles = 0;

for (const ctx of listContexts(DOMAIN_ROOT)) {
  const ctxDir = resolve(DOMAIN_ROOT, ctx);
  if (!statSync(ctxDir).isDirectory()) continue;
  const aggregates = listAggregates(ctxDir);
  if (aggregates.length === 0) continue;
  const aggSet = new Set(aggregates);

  for (const agg of aggregates) {
    const aggDir = resolve(ctxDir, agg);
    const files = walk(aggDir);
    for (const f of files) {
      const rel = relative(ROOT, f).split(sep).join("/");
      if (TEST_RE.test("/" + rel)) continue;
      scannedFiles++;
      const code = readFileSync(f, "utf8");
      for (const m of code.matchAll(IMPORT_RE)) {
        const spec = m[1];

        // Absolute @/domain/<ctx>/<other>/...
        const absMatch = spec.match(/^@\/domain\/([^/]+)\/([^/]+)/);
        if (absMatch) {
          const [, importedCtx, importedAgg] = absMatch;
          if (
            importedCtx === ctx &&
            importedAgg !== agg &&
            importedAgg !== "shared" &&
            aggSet.has(importedAgg)
          ) {
            violations.push({
              file: rel,
              import: spec,
              why: `aggregate '${agg}' imports from sibling aggregate '${importedAgg}'`,
            });
          }
          continue;
        }

        // Relative ../<other>/...
        const relMatch = spec.match(/^\.\.\/([^/]+)/);
        if (relMatch) {
          const importedAgg = relMatch[1];
          if (
            importedAgg !== agg &&
            importedAgg !== "shared" &&
            aggSet.has(importedAgg)
          ) {
            violations.push({
              file: rel,
              import: spec,
              why: `aggregate '${agg}' imports from sibling aggregate '${importedAgg}'`,
            });
          }
        }
      }
    }
  }
}

violations.sort(
  (a, b) => a.file.localeCompare(b.file) || a.import.localeCompare(b.import),
);

const report = {
  schemaVersion: 1,
  fitness: "check-aggregate-boundaries",
  adr: "ADR-0011",
  scannedFiles,
  violations,
  pass: violations.length === 0,
};
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(report, null, 2) + "\n");
const status = report.pass ? "PASS" : "FAIL";
console.log(
  `[fitness:aggregate-boundaries] ${status} — scanned=${scannedFiles} violations=${violations.length}`,
);
if (!report.pass) {
  for (const v of violations) console.log(`  ${v.file} — ${v.why} (${v.import})`);
  process.exit(1);
}
