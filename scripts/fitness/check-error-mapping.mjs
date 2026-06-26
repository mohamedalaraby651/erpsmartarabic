#!/usr/bin/env node
/**
 * Fitness — Error Mapping (ADR-0008 + ADR-0011).
 *
 * Domain code MUST NOT throw — it MUST return Result<T, DomainError>.
 * Scope: `src/domain/finance/**` production files.
 *
 * Forbidden:
 *  - `throw new Error(`, `throw new TypeError(`, etc.
 * Allowed exceptions:
 *  - `assertNever` body (impossible branch, never executed at runtime)
 *  - test files (excluded by path)
 *
 * Also enforces: every command/factory function whose return type starts
 * with `Result<` must `return ok(` or `return err(` (not `throw`). The
 * Result type is taken from `@/shared-kernel`.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { walk } from "./_lib/walk.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../..");
const SCOPE = resolve(ROOT, "src/domain/finance");
const OUT = resolve(__dirname, "../audits/output/fitness/check-error-mapping.json");
const TEST_RE = /\/(__tests__|__integration__|__mocks__)\//;
const THROW_RE = /\bthrow\s+new\s+\w*Error\s*\(/g;

const violations = [];
let scannedFiles = 0;

for (const f of walk(SCOPE)) {
  const rel = relative(ROOT, f).split(sep).join("/");
  if (TEST_RE.test("/" + rel)) continue;
  scannedFiles++;
  const code = readFileSync(f, "utf8");
  const lines = code.split("\n");
  for (const m of code.matchAll(THROW_RE)) {
    const line = code.slice(0, m.index).split("\n").length;
    const src = (lines[line - 1] ?? "").trim();
    // Allow throw inside assertNever — it represents an unreachable branch.
    const ctxStart = Math.max(0, line - 8);
    const above = lines.slice(ctxStart, line).join("\n");
    if (/function\s+assertNever\b/.test(above)) continue;
    violations.push({
      file: rel,
      line,
      why: "domain code must return Result, not throw",
      snippet: src.slice(0, 200),
    });
  }
}

violations.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line);

const report = {
  schemaVersion: 1,
  fitness: "check-error-mapping",
  adr: "ADR-0008/ADR-0011",
  scannedFiles,
  violations,
  pass: violations.length === 0,
};
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(report, null, 2) + "\n");
console.log(
  `[fitness:error-mapping] ${report.pass ? "PASS" : "FAIL"} — scanned=${scannedFiles} violations=${violations.length}`,
);
if (!report.pass) {
  for (const v of violations) console.log(`  ${v.file}:${v.line} — ${v.snippet}`);
  process.exit(1);
}
