#!/usr/bin/env node
/**
 * Fitness function — Shell isolation.
 *
 * Files under `src/ui/layout/**` and `src/ui/providers/**` MUST NOT import:
 *   - `src/workspaces/**`
 *   - `src/lib/repositories/**`
 *   - `src/integrations/**`
 *   - `@supabase/*`
 *   - `src/components/**` (except `src/components/ui/**` shadcn primitives)
 *
 * Deterministic JSON output. Non-zero exit on violation.
 */
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../..");
const SRC = resolve(ROOT, "src");
const OUT = resolve(__dirname, "../audits/output/fitness/check-shell-isolation.json");

const SCAN_DIRS = ["src/ui/layout", "src/ui/providers"];

const FORBIDDEN = [
  { pattern: /from\s+["']@\/workspaces\//, why: "workspace import in Shell" },
  { pattern: /from\s+["']@\/lib\/repositories\//, why: "repository import in Shell" },
  { pattern: /from\s+["']@\/integrations\//, why: "integration import in Shell" },
  { pattern: /from\s+["']@supabase\//, why: "supabase import in Shell" },
  {
    // allow @/components/ui/* but forbid other @/components/*
    pattern: /from\s+["']@\/components\/(?!ui\/)/,
    why: "app component import in Shell",
  },
];

function walk(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true }).sort((a, b) =>
    a.name.localeCompare(b.name)
  )) {
    const p = resolve(dir, entry.name);
    if (entry.isDirectory()) walk(p, out);
    else if (/\.(tsx?|mts|cts)$/.test(entry.name) && !entry.name.endsWith(".d.ts"))
      out.push(p);
  }
  return out;
}

const files = SCAN_DIRS.flatMap((d) => walk(resolve(ROOT, d)));
const violations = [];
for (const file of files) {
  const rel = relative(ROOT, file).split(sep).join("/");
  const code = readFileSync(file, "utf8");
  for (const rule of FORBIDDEN) {
    if (rule.pattern.test(code)) {
      violations.push({ file: rel, why: rule.why });
    }
  }
}

violations.sort((a, b) => a.file.localeCompare(b.file) || a.why.localeCompare(b.why));

const report = {
  schemaVersion: 1,
  fitness: "check-shell-isolation",
  baselineVersion: "UX-1",
  scannedFiles: files.length,
  violations,
  pass: violations.length === 0,
};

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(report, null, 2) + "\n");

const status = report.pass ? "PASS" : "FAIL";
console.log(
  `[fitness:shell-isolation] ${status} — scanned=${files.length} violations=${violations.length}`
);
if (!report.pass) {
  for (const v of violations) console.log(`  ${v.file} — ${v.why}`);
  process.exit(1);
}
