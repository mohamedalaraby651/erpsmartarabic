#!/usr/bin/env node
/**
 * Fitness — Domain BigInt Boundary (ADR-0011 + Wave 6 C3).
 *
 * Rule: no symbol exported from `src/domain/finance/index.ts` (the SOLE
 * public surface) may carry a `bigint` in its TYPE position. If the
 * aggregate ever migrates internal arithmetic to BigInt, those values
 * MUST be serialized to `string` before crossing the domain boundary
 * (the `MoneyView.minor: string` contract).
 *
 * Scope: the published index file only. Internal modules may use bigint
 * freely (see Money.mulScalar).
 *
 * Heuristic — fast & precise enough for a fitness check:
 *  - flag any occurrence of the tokens `bigint`, `BigInt`, or numeric
 *    literals with the `n` suffix (e.g. `10n`) in the index file or in
 *    any *.ts file inside `src/domain/finance/ports/**`.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { walk } from "./_lib/walk.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../..");
const INDEX_FILE = resolve(ROOT, "src/domain/finance/index.ts");
const PORTS_DIR = resolve(ROOT, "src/domain/finance/invoice/ports");
const OUT = resolve(__dirname, "../audits/output/fitness/check-domain-bigint-boundary.json");

const BIGINT_RE = /\b(bigint|BigInt)\b|\b\d+n\b/g;

function scan(file) {
  const rel = relative(ROOT, file).split(sep).join("/");
  let code;
  try {
    code = readFileSync(file, "utf8");
  } catch {
    return [];
  }
  const hits = [];
  const lines = code.split("\n");
  for (const m of code.matchAll(BIGINT_RE)) {
    const before = code.slice(0, m.index);
    const line = before.split("\n").length;
    const src = (lines[line - 1] ?? "").trim();
    if (src.startsWith("//") || src.startsWith("*")) continue;
    hits.push({ file: rel, line, token: m[0], snippet: src.slice(0, 200) });
  }
  return hits;
}

const violations = [];
violations.push(...scan(INDEX_FILE));
for (const f of walk(PORTS_DIR)) violations.push(...scan(f));

violations.sort(
  (a, b) => a.file.localeCompare(b.file) || a.line - b.line,
);

const report = {
  schemaVersion: 1,
  fitness: "check-domain-bigint-boundary",
  adr: "ADR-0011 (Wave 6 C3)",
  scannedFiles: 1 /* index */ + walk(PORTS_DIR).length,
  violations,
  pass: violations.length === 0,
};
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(report, null, 2) + "\n");
const status = report.pass ? "PASS" : "FAIL";
console.log(
  `[fitness:domain-bigint-boundary] ${status} — violations=${violations.length}`,
);
if (!report.pass) {
  for (const v of violations)
    console.log(`  ${v.file}:${v.line} — bigint at boundary :: ${v.snippet}`);
  process.exit(1);
}
