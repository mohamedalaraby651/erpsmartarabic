#!/usr/bin/env node
/**
 * Fitness — No Deep Imports into Shared Kernel.
 *
 * Outside src/shared-kernel/**, only the barrel "@/shared-kernel" may be
 * imported. Paths like "@/shared-kernel/time/Instant" or relative deep paths
 * are forbidden — they leak internal structure and block future re-organisation.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { walk } from "./_lib/walk.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../..");
const OUT = resolve(__dirname, "../audits/output/fitness/check-no-deep-imports.json");

const SCAN_DIRS = [
  "src/domain",
  "src/application",
  "src/ui",
  "src/composition",
  "src/infrastructure",
  "src/lib",
  "src/components",
  "src/hooks",
  "src/pages",
];

// Forbidden: @/shared-kernel/<anything>  OR  relative path landing inside shared-kernel/<anything>
const DEEP_ALIAS = /from\s+["']@\/shared-kernel\/[^"']+["']/g;
const DEEP_RELATIVE = /from\s+["'](?:\.\.\/)+shared-kernel\/[^"']+["']/g;

const files = SCAN_DIRS.flatMap((d) => walk(resolve(ROOT, d)));
const violations = [];

for (const f of files) {
  const rel = relative(ROOT, f).split(sep).join("/");
  const code = readFileSync(f, "utf8");
  const matches = [
    ...(code.match(DEEP_ALIAS) ?? []),
    ...(code.match(DEEP_RELATIVE) ?? []),
  ];
  for (const m of matches) {
    violations.push({ file: rel, importPath: m, why: 'Deep import — use `from "@/shared-kernel"`' });
  }
}

violations.sort((a, b) => a.file.localeCompare(b.file));

const report = {
  schemaVersion: 1,
  fitness: "check-no-deep-imports",
  scannedFiles: files.length,
  violations,
  pass: violations.length === 0,
};
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(report, null, 2) + "\n");
const status = report.pass ? "PASS" : "FAIL";
console.log(
  `[fitness:no-deep-imports] ${status} — scanned=${files.length} violations=${violations.length}`,
);
if (!report.pass) {
  for (const v of violations) console.log(`  ${v.file} — ${v.importPath}`);
  process.exit(1);
}
