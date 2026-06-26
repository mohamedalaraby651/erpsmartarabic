#!/usr/bin/env node
/**
 * Fitness — Handler Signature (ADR-0008/ADR-0011).
 *
 * Scope: `src/application/** /handlers/**` — vacuous-pass until UX-2B lands.
 * When handlers exist, each handler MUST:
 *  - take `(cmd, ctx: Readonly<RequestContext>)` as its arguments
 *  - return `Promise<Result<..., DomainError | ApplicationError | RepositoryFailure>>`
 *  - NOT throw
 *
 * Today there are no handlers; the check scans the path glob and reports
 * 0 files, so the suite passes. The scan itself is wired so the moment a
 * handler file lands it will be checked automatically.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { walk } from "./_lib/walk.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../..");
const APP = resolve(ROOT, "src/application");
const OUT = resolve(__dirname, "../audits/output/fitness/check-handler-signature.json");
const TEST_RE = /\/(__tests__|__integration__|__mocks__)\//;
const HANDLER_RE = /\/handlers\//;

const violations = [];
let scannedFiles = 0;

for (const f of walk(APP)) {
  const rel = relative(ROOT, f).split(sep).join("/");
  if (TEST_RE.test("/" + rel)) continue;
  if (!HANDLER_RE.test("/" + rel)) continue;
  scannedFiles++;
  const code = readFileSync(f, "utf8");
  if (!/RequestContext/.test(code)) {
    violations.push({ file: rel, why: "handler must take RequestContext" });
  }
  if (!/Promise<Result</.test(code)) {
    violations.push({
      file: rel,
      why: "handler must return Promise<Result<...>>",
    });
  }
  if (/\bthrow\s+new\s+\w*Error\s*\(/.test(code)) {
    violations.push({ file: rel, why: "handler must not throw" });
  }
}

const report = {
  schemaVersion: 1,
  fitness: "check-handler-signature",
  adr: "ADR-0008/ADR-0011",
  scannedFiles,
  violations,
  pass: violations.length === 0,
};
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(report, null, 2) + "\n");
console.log(
  `[fitness:handler-signature] ${report.pass ? "PASS" : "FAIL"} — scanned=${scannedFiles} violations=${violations.length}`,
);
if (!report.pass) process.exit(1);
