#!/usr/bin/env node
/**
 * Fitness — Retryability Single Source (ADR-0010, Rule R-0010-03).
 *
 * Exactly one exported `isRetryable` MUST exist under
 * src/shared-kernel/errors/**. Zero re-implementations elsewhere.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { walk } from "./_lib/walk.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../..");
const OUT = resolve(
  __dirname,
  "../audits/output/fitness/check-retryability-single-source.json",
);

const KERNEL_DIR = resolve(ROOT, "src/shared-kernel/errors");
const SCAN_OTHER = ["src/domain", "src/application", "src/infrastructure", "src/ui", "src/composition"];

// Counts only true DECLARATIONS (function/const/let/var). Re-exports via
// `export { isRetryable } from "..."` in barrel files are not declarations.
const EXPORT_DECL =
  /export\s+(?:function|const|let|var)\s+isRetryable\b/;
const REIMPL =
  /(?:function|const|let|var)\s+isRetryable\b\s*[=(]/;

function gather(dir) {
  return walk(dir);
}

const kernelFiles = gather(KERNEL_DIR);
const kernelExporters = [];
for (const f of kernelFiles) {
  const code = readFileSync(f, "utf8");
  if (EXPORT_DECL.test(code))
    kernelExporters.push(relative(ROOT, f).split(sep).join("/"));
}

const otherFiles = SCAN_OTHER.flatMap((d) => walk(resolve(ROOT, d)));
const reimplementations = [];
for (const f of otherFiles) {
  const rel = relative(ROOT, f).split(sep).join("/");
  const code = readFileSync(f, "utf8");
  if (REIMPL.test(code)) reimplementations.push(rel);
}

const violations = [];
if (kernelExporters.length !== 1) {
  violations.push({
    why: `Expected exactly 1 isRetryable exporter under shared-kernel/errors, found ${kernelExporters.length}`,
    files: kernelExporters,
  });
}
for (const r of reimplementations) {
  violations.push({ file: r, why: "Re-implementation of isRetryable outside shared-kernel/errors" });
}

const report = {
  schemaVersion: 1,
  fitness: "check-retryability-single-source",
  adr: "ADR-0010",
  kernelExporters,
  reimplementations,
  violations,
  pass: violations.length === 0,
};
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(report, null, 2) + "\n");
const status = report.pass ? "PASS" : "FAIL";
console.log(
  `[fitness:retryability-single-source] ${status} — exporters=${kernelExporters.length} reimplementations=${reimplementations.length}`,
);
if (!report.pass) {
  for (const v of violations) console.log(`  ${JSON.stringify(v)}`);
  process.exit(1);
}
