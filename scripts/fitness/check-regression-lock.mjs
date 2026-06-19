#!/usr/bin/env node
/**
 * Fitness — Regression lock (UX-1E, invariant E9).
 *
 * `known-findings.json` is the only allowed source of accepted gaps. Any
 * finding referenced in the UX1E_INTEGRATION_READINESS report that is not
 * listed (by id) in `known-findings.json` fails CI.
 *
 * Also validates that each known-finding has the mandatory fields.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../..");
const OUT = resolve(__dirname, "../audits/output/fitness/check-regression-lock.json");
const KNOWN = resolve(ROOT, "docs/architecture/ux1e-evidence/known-findings.json");
const REPORT = resolve(ROOT, "docs/architecture/UX1E_INTEGRATION_READINESS.md");

const violations = [];
const REQUIRED = ["id", "severity", "composite", "summary", "owner", "deferredTo"];
const SEVERITIES = ["blocker", "major", "minor", "none"];

if (!existsSync(KNOWN)) {
  violations.push({ kind: "missing", detail: "known-findings.json not found" });
} else {
  const known = JSON.parse(readFileSync(KNOWN, "utf8"));
  if (!Array.isArray(known)) {
    violations.push({ kind: "shape", detail: "known-findings.json must be an array" });
  } else {
    const seen = new Set();
    for (const item of known) {
      for (const k of REQUIRED) {
        if (!(k in item)) violations.push({ kind: "missing-field", id: item.id ?? "?", field: k });
      }
      if (item.id && seen.has(item.id)) violations.push({ kind: "duplicate-id", id: item.id });
      if (item.id) seen.add(item.id);
      if (item.severity && !SEVERITIES.includes(item.severity)) {
        violations.push({ kind: "bad-severity", id: item.id, severity: item.severity });
      }
      if (item.severity === "blocker") {
        violations.push({ kind: "blocker-listed", id: item.id, detail: "blocker cannot be in known-findings" });
      }
    }

    // Cross-reference the report: every RISK-006-NN mentioned must exist in known-findings.
    if (existsSync(REPORT)) {
      const md = readFileSync(REPORT, "utf8");
      const mentioned = new Set();
      for (const m of md.matchAll(/RISK-006-\d{2}/g)) mentioned.add(m[0]);
      for (const id of mentioned) {
        if (!seen.has(id)) violations.push({ kind: "undeclared-finding", id });
      }
    }
  }
}

const report = {
  schemaVersion: 1,
  fitness: "check-regression-lock",
  baselineVersion: "UX-1E",
  violations,
  pass: violations.length === 0,
};
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(report, null, 2) + "\n");
console.log(`[fitness:regression-lock] ${report.pass ? "PASS" : "FAIL"} — violations=${violations.length}`);
if (!report.pass) {
  for (const v of violations) console.log(`  ${JSON.stringify(v)}`);
  process.exit(1);
}
