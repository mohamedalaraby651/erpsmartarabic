#!/usr/bin/env node
/**
 * Fitness — Transaction Finality (ADR-0008).
 *
 * Scope: `src/application/**/handlers/**` — vacuous PASS until UX-2B.
 * When handlers exist, each handler body MUST NOT:
 *  - perform a read after a write within the same call (heuristic: a
 *    `.findBy*` / `.byId(` / `.list(` call following an `.appendEvents(`
 *    in the same function)
 *  - call multiple `UnitOfWork.commit()` (each handler is one UoW)
 *
 * Today the scope is empty so the check passes with `scannedFiles=0`.
 * The path is wired so the moment a handler lands the rule activates.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { walk } from "./_lib/walk.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../..");
const APP = resolve(ROOT, "src/application");
const OUT = resolve(__dirname, "../audits/output/fitness/check-transaction-finality.json");
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
  const appendIdx = code.indexOf(".appendEvents(");
  if (appendIdx === -1) continue;
  const after = code.slice(appendIdx);
  if (/\.(?:byId|list|findBy[A-Z]\w*)\s*\(/.test(after)) {
    violations.push({
      file: rel,
      why: "read after write within same handler body",
    });
  }
  const commits = code.match(/\.commit\s*\(/g) ?? [];
  if (commits.length > 1) {
    violations.push({ file: rel, why: "multiple UoW commits in one handler" });
  }
}

const report = {
  schemaVersion: 1,
  fitness: "check-transaction-finality",
  adr: "ADR-0008",
  scannedFiles,
  violations,
  pass: violations.length === 0,
};
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(report, null, 2) + "\n");
console.log(
  `[fitness:transaction-finality] ${report.pass ? "PASS" : "FAIL"} — scanned=${scannedFiles} violations=${violations.length}`,
);
if (!report.pass) process.exit(1);
