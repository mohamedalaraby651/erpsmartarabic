#!/usr/bin/env node
/**
 * Fitness — `metadata` is operational-only (UX-2B Wave 2B, ADR-0012 §D-0012-09).
 *
 * The `metadata` field of any DomainEvent is reserved for tracing /
 * audit / correlation. Domain code MUST NOT read it (no branching, no
 * lookups, no reducers conditioned on it). Business truth lives in
 * `payload`.
 *
 * Scope: `src/domain/finance/**` (extend as more bounded contexts land).
 *
 * Allowed sites:
 *   - the shared kernel re-export of `DomainEventMetadata` (out of scope).
 *   - identifier appearances inside comments / JSDoc.
 *
 * Heuristic: any line under the domain scope that contains the bare
 * identifier `metadata` (word boundary) and is NOT a comment, and is NOT
 * the import line `import type { ... DomainEventMetadata ... }`, is a
 * violation. Property keys named `metadata` are excluded only when they
 * appear in a TYPE definition (re-exporting the kernel shape) — the
 * heuristic admits these via a `metadata?:` or `metadata:` shape line
 * immediately preceded by a `?` or `:` followed by `DomainEventMetadata`.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { walk } from "./_lib/walk.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../..");
const SCOPE = resolve(ROOT, "src/domain/finance");
const OUT = resolve(
  __dirname,
  "../audits/output/fitness/check-metadata-non-domain.json",
);

const TEST_RE = /\/(__tests__|__integration__|__mocks__)\//;
const IDENT_RE = /\bmetadata\b/;

const violations = [];
let scannedFiles = 0;

if (existsSync(SCOPE)) {
  for (const f of walk(SCOPE)) {
    const rel = relative(ROOT, f).split(sep).join("/");
    if (TEST_RE.test("/" + rel)) continue;
    if (!/\.tsx?$/.test(rel)) continue;
    scannedFiles++;
    const code = readFileSync(f, "utf8");
    const lines = code.split("\n");
    for (let i = 0; i < lines.length; i++) {
      const ln = lines[i];
      if (!IDENT_RE.test(ln)) continue;
      const trimmed = ln.trim();
      // Skip comments and JSDoc lines.
      if (
        trimmed.startsWith("//") ||
        trimmed.startsWith("*") ||
        trimmed.startsWith("/*")
      )
        continue;
      // Allow type-shape lines that *describe* the kernel metadata field
      // (e.g. `metadata?: DomainEventMetadata;` in a re-export interface).
      if (/metadata\??\s*:\s*DomainEventMetadata\b/.test(ln)) continue;
      // Allow named-imports of the kernel type itself.
      if (/^\s*import\b/.test(ln) && /DomainEventMetadata/.test(ln)) continue;
      violations.push({
        file: rel,
        line: i + 1,
        snippet: trimmed.slice(0, 200),
        why: "domain code references `metadata` (ADR-0012 §D-0012-09: operational only)",
      });
    }
  }
}

violations.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line);

const report = {
  schemaVersion: 1,
  fitness: "check-metadata-non-domain",
  adr: "ADR-0012 §D-0012-09",
  scope: "src/domain/finance/**",
  scannedFiles,
  violations,
  pass: violations.length === 0,
};
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(report, null, 2) + "\n");
console.log(
  `[fitness:metadata-non-domain] ${report.pass ? "PASS" : "FAIL"} — scanned=${scannedFiles} violations=${violations.length}`,
);
if (!report.pass) process.exit(1);
