#!/usr/bin/env node
/**
 * Fitness — Domain Service Purity (Wave 7).
 *
 * Scope: `src/domain/finance/**` files whose path segment is `services`
 * (none exist today — vacuous-pass while waiting for UX-2A Wave 8+).
 * When services land, they MUST be pure: same forbidden-token set as
 * `check-domain-purity` PLUS a ban on any port interface call site
 * inside the service body (services orchestrate VOs, never I/O).
 *
 * Current implementation: scans the path glob and reports 0 files;
 * any future service file is auto-picked-up.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { walk } from "./_lib/walk.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../..");
const FINANCE = resolve(ROOT, "src/domain/finance");
const OUT = resolve(__dirname, "../audits/output/fitness/check-domain-service-purity.json");
const TEST_RE = /\/(__tests__|__integration__|__mocks__)\//;
const SERVICE_RE = /\/services\//;

const BANS = [
  { re: /from\s+["']react(?:-dom|-router[^"']*)?["']/g, why: "UI framework import" },
  { re: /from\s+["']@supabase\/[^"']+["']/g, why: "@supabase import" },
  { re: /\bawait\s+fetch\s*\(/g, why: "await fetch(" },
  { re: /\bMath\.(round|floor|ceil|trunc)\s*\(/g, why: "float-unsafe Math call" },
  { re: /\.toFixed\s*\(/g, why: ".toFixed(" },
  { re: /\bJSON\.(stringify|parse)\s*\(/g, why: "JSON at domain edge" },
  { re: /\bRepository\b/g, why: "service references repository (must be pure)" },
];

const violations = [];
let scannedFiles = 0;

for (const f of walk(FINANCE)) {
  const rel = relative(ROOT, f).split(sep).join("/");
  if (TEST_RE.test("/" + rel)) continue;
  if (!SERVICE_RE.test("/" + rel)) continue;
  scannedFiles++;
  const code = readFileSync(f, "utf8");
  const lines = code.split("\n");
  for (const { re, why } of BANS) {
    re.lastIndex = 0;
    for (const m of code.matchAll(re)) {
      const line = code.slice(0, m.index).split("\n").length;
      const src = (lines[line - 1] ?? "").trim();
      if (src.startsWith("//") || src.startsWith("*")) continue;
      violations.push({ file: rel, line, why, snippet: src.slice(0, 200) });
    }
  }
}

const report = {
  schemaVersion: 1,
  fitness: "check-domain-service-purity",
  adr: "ADR-0011",
  scannedFiles,
  violations,
  pass: violations.length === 0,
};
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(report, null, 2) + "\n");
console.log(
  `[fitness:domain-service-purity] ${report.pass ? "PASS" : "FAIL"} — scanned=${scannedFiles} violations=${violations.length}`,
);
if (!report.pass) process.exit(1);
