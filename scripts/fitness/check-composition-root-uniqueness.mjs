#!/usr/bin/env node
/**
 * Fitness — Composition Root Uniqueness (ADR-0004).
 *
 * At most ONE composition root may exist:
 *   `src/composition/index.ts` (or `src/main.ts` once UX-2B lands).
 *
 * Today nothing wires real adapters → vacuous PASS.  The check is wired
 * to spot a second composition entry-point the moment one is added.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { walk } from "./_lib/walk.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../..");
const SRC = resolve(ROOT, "src");
const OUT = resolve(__dirname, "../audits/output/fitness/check-composition-root-uniqueness.json");

// A composition root is recognised by the presence of BOTH a wiring
// helper (`compose(`, `createContainer(`, `buildAdapters(`) AND
// imports from `infrastructure` AND `application` in the same file.
const roots = [];

for (const f of walk(SRC)) {
  const rel = relative(ROOT, f).split(sep).join("/");
  if (/\/(__tests__|__integration__|__mocks__)\//.test("/" + rel)) continue;
  const code = readFileSync(f, "utf8");
  const hasWiring = /\b(compose|createContainer|buildAdapters)\s*\(/.test(code);
  const hasInfra = /from\s+["'][^"']*infrastructure[^"']*["']/.test(code);
  const hasApp = /from\s+["'][^"']*application[^"']*["']/.test(code);
  if (hasWiring && hasInfra && hasApp) roots.push(rel);
}

const violations =
  roots.length <= 1
    ? []
    : [{ why: "more than one composition root detected", roots }];

const report = {
  schemaVersion: 1,
  fitness: "check-composition-root-uniqueness",
  adr: "ADR-0004",
  rootsFound: roots,
  violations,
  pass: violations.length === 0,
};
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(report, null, 2) + "\n");
console.log(
  `[fitness:composition-root-uniqueness] ${report.pass ? "PASS" : "FAIL"} — roots=${roots.length}`,
);
if (!report.pass) process.exit(1);
