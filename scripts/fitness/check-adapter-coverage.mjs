#!/usr/bin/env node
/**
 * Fitness — Adapter coverage matrix (UX-1E).
 *
 * Reads `docs/architecture/ux1e-evidence/adapter-coverage.json` and asserts
 * every composite declared in the integration manifest appears with at
 * least one scenario. Run AFTER `build-adapter-coverage` (or with the
 * static seed committed to the repo).
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../..");
const OUT = resolve(__dirname, "../audits/output/fitness/check-adapter-coverage.json");
const COVERAGE = resolve(ROOT, "docs/architecture/ux1e-evidence/adapter-coverage.json");
const MANIFEST = resolve(ROOT, "src/ui/__integration__/integration.manifest.ts");

const violations = [];

if (!existsSync(COVERAGE)) {
  violations.push({ kind: "missing", detail: "adapter-coverage.json not found" });
} else if (!existsSync(MANIFEST)) {
  violations.push({ kind: "missing", detail: "integration.manifest.ts not found" });
} else {
  const manifestSrc = readFileSync(MANIFEST, "utf8");
  const composites = [];
  const block = manifestSrc.match(/composites:\s*\[(.*?)\]/s);
  if (block) {
    for (const m of block[1].matchAll(/"([^"]+)"/g)) composites.push(m[1]);
  }
  const coverage = JSON.parse(readFileSync(COVERAGE, "utf8"));
  for (const c of composites) {
    const list = coverage[c];
    if (!Array.isArray(list) || list.length === 0) {
      violations.push({ kind: "uncovered", composite: c });
    }
  }
  for (const c of Object.keys(coverage)) {
    if (!composites.includes(c)) {
      violations.push({ kind: "stale", composite: c, detail: "not in manifest" });
    }
  }
}

const report = {
  schemaVersion: 1,
  fitness: "check-adapter-coverage",
  baselineVersion: "UX-1E",
  violations,
  pass: violations.length === 0,
};
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(report, null, 2) + "\n");
console.log(`[fitness:adapter-coverage] ${report.pass ? "PASS" : "FAIL"} — violations=${violations.length}`);
if (!report.pass) {
  for (const v of violations) console.log(`  ${JSON.stringify(v)}`);
  process.exit(1);
}
