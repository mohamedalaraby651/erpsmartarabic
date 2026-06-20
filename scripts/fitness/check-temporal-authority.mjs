#!/usr/bin/env node
/**
 * Fitness — Temporal Authority (ADR-0006, Rules R-0006-01..05).
 *
 * Only ClockPort.now() may produce the current moment. Forbidden forms:
 *   Date.now, new Date() with no args, performance.now, process.hrtime,
 *   Intl.DateTimeFormat used for current-time discovery.
 *
 * Scanned: src/domain, src/application (minus ClockPort.ts), src/ui,
 *          src/composition, src/shared-kernel (minus time/).
 * Allowed: src/infrastructure/clock/SystemClock.ts (production wall-clock),
 *          src/infrastructure/repositories/** and src/shared-kernel/time/**
 *          for `new Date(epochMillis)` deserialization (numeric arg).
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { walk } from "./_lib/walk.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../..");
const OUT = resolve(__dirname, "../audits/output/fitness/check-temporal-authority.json");

const SCAN_DIRS = [
  "src/domain",
  "src/application",
  "src/ui",
  "src/composition",
  "src/shared-kernel",
];

const ALLOW_FILES = new Set([
  "src/application/ports/ClockPort.ts", // legacy path tolerance
  "src/shared-kernel/time/ClockPort.ts",
  "src/infrastructure/clock/SystemClock.ts",
]);

const ALLOW_DESERIALIZATION_PREFIXES = [
  "src/infrastructure/repositories/",
  "src/shared-kernel/time/",
];

const FORBIDDEN_ALWAYS = [
  { pattern: /\bDate\.now\s*\(/, why: "Date.now() — use ClockPort.now()" },
  { pattern: /\bperformance\.now\s*\(/, why: "performance.now() — wall-clock read" },
  { pattern: /\bprocess\.hrtime\b/, why: "process.hrtime — wall-clock read" },
  {
    pattern: /\bnew\s+Date\s*\(\s*\)/,
    why: "new Date() with no args — use ClockPort.now()",
  },
  {
    pattern: /\bnew\s+Intl\.DateTimeFormat\b[\s\S]{0,80}\bformat\s*\(\s*new\s+Date\s*\(\s*\)/,
    why: "Intl.DateTimeFormat current-time read",
  },
];

// `new Date(x)` with any arg (numeric/string/Date) — forbidden outside deserialization allow-list.
const NEW_DATE_WITH_ARG = /\bnew\s+Date\s*\(\s*[^)]/;

const TEST_PATH_RE = /\/(__tests__|__integration__|__mocks__)\//;

const files = SCAN_DIRS.flatMap((d) => walk(resolve(ROOT, d)));
const violations = [];

for (const f of files) {
  const rel = relative(ROOT, f).split(sep).join("/");
  if (ALLOW_FILES.has(rel)) continue;
  if (TEST_PATH_RE.test("/" + rel)) continue;
  const code = readFileSync(f, "utf8");

  for (const rule of FORBIDDEN_ALWAYS) {
    if (rule.pattern.test(code)) violations.push({ file: rel, why: rule.why });
  }

  const isDeserBoundary = ALLOW_DESERIALIZATION_PREFIXES.some((p) =>
    rel.startsWith(p),
  );
  if (!isDeserBoundary && NEW_DATE_WITH_ARG.test(code)) {
    violations.push({
      file: rel,
      why: "new Date(arg) outside deserialization boundary — derive Instant via ClockPort or Instant.fromEpochMillis",
    });
  }
}

violations.sort((a, b) => a.file.localeCompare(b.file) || a.why.localeCompare(b.why));

const report = {
  schemaVersion: 1,
  fitness: "check-temporal-authority",
  adr: "ADR-0006",
  scannedFiles: files.length,
  violations,
  pass: violations.length === 0,
};
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(report, null, 2) + "\n");
const status = report.pass ? "PASS" : "FAIL";
console.log(
  `[fitness:temporal-authority] ${status} — scanned=${files.length} violations=${violations.length}`,
);
if (!report.pass) {
  for (const v of violations) console.log(`  ${v.file} — ${v.why}`);
  process.exit(1);
}
