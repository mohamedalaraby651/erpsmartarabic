#!/usr/bin/env node
/**
 * Fitness — Identity Authority (ADR-0006, Rule R-0008).
 *
 * Only IdPort may produce identifiers. Forbidden outside allow-listed paths:
 *   crypto.randomUUID(), Math.random()-based ids, uuid()/uuidv4() calls,
 *   `as Id<...>` type assertions.
 *
 * Allowed: src/shared-kernel/identity/**, src/infrastructure/identity/**,
 *          src/infrastructure/repositories/** (deserialization boundary),
 *          any __tests__/** path (test fixtures).
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { walk } from "./_lib/walk.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../..");
const OUT = resolve(__dirname, "../audits/output/fitness/check-identity-authority.json");

const SCAN_DIRS = [
  "src/domain",
  "src/application",
  "src/ui",
  "src/composition",
  "src/shared-kernel",
  "src/infrastructure",
];

const ALLOW_PREFIXES = [
  "src/shared-kernel/identity/",
  "src/infrastructure/identity/",
  "src/infrastructure/repositories/",
];

const FORBIDDEN = [
  { pattern: /\bcrypto\.randomUUID\s*\(/, why: "crypto.randomUUID — use IdPort.generate()" },
  { pattern: /\buuidv?4?\s*\(/i, why: "uuid()/uuidv4() — use IdPort.generate()" },
  {
    pattern: /\bMath\.random\s*\([\s\S]{0,200}?\b(id|Id|ID|identifier)\b/,
    why: "Math.random-based identifier — use IdPort.generate()",
  },
  {
    pattern: /\bas\s+Id\s*<[^>]+>/,
    why: "Type assertion `as Id<...>` — construct via IdPort or unsafeId in allow-listed paths",
  },
];

const files = SCAN_DIRS.flatMap((d) => walk(resolve(ROOT, d)));
const violations = [];

for (const f of files) {
  const rel = relative(ROOT, f).split(sep).join("/");
  const isAllowed =
    ALLOW_PREFIXES.some((p) => rel.startsWith(p)) ||
    /\/(__tests__|__integration__|__mocks__)\//.test("/" + rel);
  if (isAllowed) continue;
  const code = readFileSync(f, "utf8");
  for (const rule of FORBIDDEN) {
    if (rule.pattern.test(code)) violations.push({ file: rel, why: rule.why });
  }
}

violations.sort((a, b) => a.file.localeCompare(b.file) || a.why.localeCompare(b.why));

const report = {
  schemaVersion: 1,
  fitness: "check-identity-authority",
  adr: "ADR-0006",
  rule: "R-0008",
  scannedFiles: files.length,
  violations,
  pass: violations.length === 0,
};
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(report, null, 2) + "\n");
const status = report.pass ? "PASS" : "FAIL";
console.log(
  `[fitness:identity-authority] ${status} — scanned=${files.length} violations=${violations.length}`,
);
if (!report.pass) {
  for (const v of violations) console.log(`  ${v.file} — ${v.why}`);
  process.exit(1);
}
