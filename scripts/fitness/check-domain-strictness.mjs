#!/usr/bin/env node
/**
 * Fitness — Domain Strictness (UX-2A Wave 8 G2).
 *
 * Forbids any escape hatch from the strict-TS surface inside the
 * PRODUCTION code of `src/domain/finance/**`. Scoped to non-test files:
 * tests legitimately use `as any` / `as unknown as` to probe runtime
 * shape and reject-bad-input paths that the type system would otherwise
 * forbid. The architectural intent is production strictness — once a
 * value crosses a public API, no escape hatch may have shaped it.
 *
 * Banned tokens (production only):
 *   - `@ts-ignore`
 *   - `@ts-expect-error`
 *   - `@ts-nocheck`
 *   - `as any`
 *   - `as unknown as`
 *
 * Pairs with `tsconfig.finance.json` (noUncheckedIndexedAccess,
 * exactOptionalPropertyTypes, noImplicitOverride,
 * noPropertyAccessFromIndexSignature, strict). The tsconfig catches type
 * laxness across BOTH production and tests; this check catches the
 * textual escape hatches that survive on the production side.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { walk } from "./_lib/walk.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../..");
const SCOPE = resolve(ROOT, "src/domain/finance");
const OUT = resolve(
  __dirname,
  "../audits/output/fitness/check-domain-strictness.json",
);

const BANS = [
  { pattern: /@ts-ignore/, rule: "no @ts-ignore in finance domain" },
  { pattern: /@ts-expect-error/, rule: "no @ts-expect-error in finance domain" },
  { pattern: /@ts-nocheck/, rule: "no @ts-nocheck in finance domain" },
  { pattern: /\bas\s+any\b/, rule: "no `as any` cast in finance domain" },
  {
    pattern: /\bas\s+unknown\s+as\b/,
    rule: "no `as unknown as` double-cast in finance domain",
  },
];

const violations = [];
let scannedFiles = 0;

for (const f of walk(SCOPE)) {
  if (!/\.tsx?$/.test(f)) continue;
  const rel = relative(ROOT, f).split(sep).join("/");
  // Production-only scope — see header.
  if (/\/__tests__\//.test("/" + rel) || /\.test\.tsx?$/.test(rel)) continue;
  scannedFiles++;
  const lines = readFileSync(f, "utf8").split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Skip pure-comment lines that document the bans (the strings themselves
    // would otherwise trigger this check).
    const trimmed = line.trim();
    const isCommentLine =
      trimmed.startsWith("*") ||
      trimmed.startsWith("//") ||
      trimmed.startsWith("/*");
    if (isCommentLine) continue;
    for (const { pattern, rule } of BANS) {
      if (pattern.test(line)) {
        violations.push({
          file: rel,
          line: i + 1,
          rule,
          snippet: trimmed.slice(0, 160),
        });
      }
    }
  }
}

violations.sort(
  (a, b) =>
    a.file.localeCompare(b.file) || a.line - b.line || a.rule.localeCompare(b.rule),
);

const report = {
  schemaVersion: 1,
  fitness: "check-domain-strictness",
  adr: "ADR-0011 (Wave 8 G2)",
  scope: "src/domain/finance",
  scannedFiles,
  violations,
  pass: violations.length === 0,
};

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(report, null, 2) + "\n");
const status = report.pass ? "PASS" : "FAIL";
console.log(
  `[fitness:domain-strictness] ${status} — scanned=${scannedFiles} violations=${violations.length}`,
);
if (!report.pass) {
  for (const v of violations) {
    console.log(`  ${v.file}:${v.line} — ${v.rule}  «${v.snippet}»`);
  }
  process.exit(1);
}
