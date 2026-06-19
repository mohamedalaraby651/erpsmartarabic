#!/usr/bin/env node
/**
 * Fitness — Canonical lifecycle tags.
 *
 * Every `.ts`/`.tsx` file directly under `src/ui/primitives/` (excluding
 * `_internal/`, `__tests__/`, `__demo__/`, and `index.ts`) MUST begin with
 * a JSDoc block declaring `@canonicalState`, `@adr`, and `@since`.
 */
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../..");
const OUT = resolve(
  __dirname,
  "../audits/output/fitness/check-canonical-lifecycle-tags.json",
);
const SCAN = resolve(ROOT, "src/ui/primitives");

const VALID_STATES = ["Experimental", "Candidate", "Canonical", "Deprecated", "Removed"];

function listPrimitives(dir, out = []) {
  for (const e of readdirSync(dir, { withFileTypes: true }).sort((a, b) =>
    a.name.localeCompare(b.name),
  )) {
    if (e.isDirectory()) {
      if (["_internal", "__tests__", "__demo__"].includes(e.name)) continue;
      listPrimitives(resolve(dir, e.name), out);
    } else if (/\.(ts|tsx)$/.test(e.name) && !["index.ts", "types.ts"].includes(e.name)) {
      out.push(resolve(dir, e.name));
    }
  }
  return out;
}

const files = listPrimitives(SCAN);
const violations = [];
for (const f of files) {
  const rel = relative(ROOT, f).split(sep).join("/");
  const code = readFileSync(f, "utf8").slice(0, 800);
  const state = code.match(/@canonicalState\s+(\S+)/)?.[1];
  const adr = /@adr\s+ADR-\d{4}/.test(code);
  const since = /@since\s+UX-/.test(code);
  if (!state) violations.push({ file: rel, why: "missing @canonicalState" });
  else if (!VALID_STATES.includes(state))
    violations.push({ file: rel, why: `invalid @canonicalState "${state}"` });
  if (!adr) violations.push({ file: rel, why: "missing @adr ADR-NNNN" });
  if (!since) violations.push({ file: rel, why: "missing @since UX-N" });
}
violations.sort((a, b) => a.file.localeCompare(b.file) || a.why.localeCompare(b.why));

const report = {
  schemaVersion: 1,
  fitness: "check-canonical-lifecycle-tags",
  baselineVersion: "UX-1",
  scannedFiles: files.length,
  violations,
  pass: violations.length === 0,
};
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(report, null, 2) + "\n");
const status = report.pass ? "PASS" : "FAIL";
console.log(
  `[fitness:lifecycle-tags] ${status} — scanned=${files.length} violations=${violations.length}`,
);
if (!report.pass) {
  for (const v of violations) console.log(`  ${v.file} — ${v.why}`);
  process.exit(1);
}
