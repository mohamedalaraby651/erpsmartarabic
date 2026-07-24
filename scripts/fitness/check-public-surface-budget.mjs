#!/usr/bin/env node
/**
 * Fitness — Public Surface Budget (Report-only, Sprint 3.1 Batch A v3)
 *
 * Measures — does NOT enforce — the size of public API barrels.
 * Flip to enforcing in UX-3A Wave 2.5 once budgets are stable.
 *
 * Budgets:
 *   src/ui/index.ts:                   max 100, target ≤90, ideal ≤75
 *   src/application/queries/index.ts:  max  40, target ≤30, ideal ≤20
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..", "..");

const targets = [
  { path: "src/ui/index.ts", max: 100, target: 90, ideal: 75 },
  { path: "src/application/queries/index.ts", max: 40, target: 30, ideal: 20 },
];

function countExports(file) {
  if (!existsSync(file)) return null;
  const src = readFileSync(file, "utf8");
  // Count top-level `export` statements (excluding comments/blank lines).
  const lines = src.split(/\r?\n/);
  let count = 0;
  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith("//") || line.startsWith("*") || line.startsWith("/*")) continue;
    if (/^export\b/.test(line)) count += 1;
  }
  return count;
}

const report = {
  generatedAt: new Date().toISOString(),
  mode: "report-only",
  budgets: targets.map((t) => {
    const abs = resolve(root, t.path);
    const exportsCount = countExports(abs);
    const status =
      exportsCount == null
        ? "missing"
        : exportsCount <= t.ideal
        ? "ideal"
        : exportsCount <= t.target
        ? "target"
        : exportsCount <= t.max
        ? "within-max"
        : "over-budget";
    return { ...t, exportsCount, status };
  }),
};

const outDir = resolve(root, "scripts/audits/output/fitness");
mkdirSync(outDir, { recursive: true });
writeFileSync(resolve(outDir, "public-surface-budget.json"), JSON.stringify(report, null, 2));

// Report-only: always exit 0. Print a summary.
for (const b of report.budgets) {
  console.log(
    `[public-surface-budget] ${b.path}: exports=${b.exportsCount ?? "n/a"} (max=${b.max}, target≤${b.target}, ideal≤${b.ideal}) → ${b.status}`
  );
}
process.exit(0);
