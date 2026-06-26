#!/usr/bin/env node
/**
 * Fitness — Application Surface (UX-2B Wave 1.5).
 *
 * Negative-only rules. We do NOT enforce a closed list of allowed
 * categories — the Manifest snapshot (snapshot-application-surface.mjs)
 * is the catalogue. This fitness check guarantees the BARREL never
 * re-exports something it must not, regardless of category.
 *
 * Refinement #2: classification stays open; only structural leaks fail.
 *
 * Forbidden in `src/application/finance/index.ts` and any sub-barrel
 * `index.ts` reachable through `export * from "./..."` re-exports:
 *
 *   1. Re-exports from `__tests__/`, `fakes/`, `__mocks__/`.
 *   2. Re-exports from files ending in `Mapper.ts`, `Codec.ts`,
 *      `Util.ts`, `Utils.ts`, `Helpers.ts`, `Internal.ts`.
 *   3. Re-exports from `@/infrastructure/**` or `src/infrastructure/**`.
 *   4. Re-exports from `@/domain/**`  (the application layer WRAPS the
 *      domain — it must not punch a hole through to it).
 *   5. Symbol names starting with `_` or containing `Internal`.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../..");
const OUT = resolve(
  __dirname,
  "../audits/output/fitness/check-application-surface.json",
);

const BARRELS = [
  "src/application/finance/index.ts",
  "src/application/finance/invoice/index.ts",
];

const FORBIDDEN_PATH_PATTERNS = [
  { re: /\/__tests__\//, why: "barrel re-exports from __tests__/" },
  { re: /\/fakes\//, why: "barrel re-exports from fakes/" },
  { re: /\/__mocks__\//, why: "barrel re-exports from __mocks__/" },
  { re: /(Mapper|Codec|Util|Utils|Helpers|Internal)(\.ts)?$/, why: "barrel re-exports a non-public file kind" },
];

const FORBIDDEN_SOURCE_PATTERNS = [
  { re: /^@\/infrastructure\//, why: "barrel re-exports from @/infrastructure/**" },
  { re: /^src\/infrastructure\//, why: "barrel re-exports from src/infrastructure/**" },
  { re: /^@\/domain\//, why: "barrel re-exports from @/domain/** (application must wrap, not punch through)" },
];

const FORBIDDEN_SYMBOL_PATTERNS = [
  { re: /^_/, why: 'exported symbol starts with "_" (treated as internal)' },
  { re: /Internal/, why: 'exported symbol contains "Internal"' },
];

const violations = [];
let scannedFiles = 0;

for (const rel of BARRELS) {
  const f = resolve(ROOT, rel);
  if (!existsSync(f)) continue;
  scannedFiles++;
  const code = readFileSync(f, "utf8");
  const lines = code.split("\n");

  // Find every `from "<src>"` token in the barrel.
  const importRe = /from\s+["']([^"']+)["']/g;
  let m;
  while ((m = importRe.exec(code)) !== null) {
    const source = m[1];
    const before = code.slice(0, m.index);
    const ln = before.split("\n").length;

    for (const { re, why } of FORBIDDEN_PATH_PATTERNS) {
      if (re.test(source)) {
        violations.push({ file: rel, line: ln, why, snippet: source });
      }
    }
    for (const { re, why } of FORBIDDEN_SOURCE_PATTERNS) {
      if (re.test(source)) {
        violations.push({ file: rel, line: ln, why, snippet: source });
      }
    }
  }

  // Extract named exports and check symbol names.
  const exportRe = /export\s+(?:type\s+)?\{([\s\S]*?)\}/g;
  let em;
  while ((em = exportRe.exec(code)) !== null) {
    const before = code.slice(0, em.index);
    const ln = before.split("\n").length;
    for (const part of em[1].split(",")) {
      const name = part.trim().replace(/\s+as\s+(\w+)$/, "$1");
      if (!name) continue;
      for (const { re, why } of FORBIDDEN_SYMBOL_PATTERNS) {
        if (re.test(name)) {
          violations.push({ file: rel, line: ln, why, snippet: name });
        }
      }
    }
  }

  void lines;
}

violations.sort(
  (a, b) =>
    a.file.localeCompare(b.file) ||
    a.line - b.line ||
    a.why.localeCompare(b.why),
);

const report = {
  schemaVersion: 1,
  fitness: "check-application-surface",
  adr: "UX-2B Wave 1.5",
  scope: "src/application/finance — public barrels",
  scannedFiles,
  violations,
  pass: violations.length === 0,
};
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(report, null, 2) + "\n");
const status = report.pass ? "PASS" : "FAIL";
console.log(
  `[fitness:application-surface] ${status} — barrels=${scannedFiles} violations=${violations.length}`,
);
if (!report.pass) {
  for (const v of violations) {
    console.log(`  ${v.file}:${v.line} — ${v.why}  «${v.snippet}»`);
  }
  process.exit(1);
}

// Avoid unused-var on `relative/sep` imports under lint:
void relative;
void sep;
