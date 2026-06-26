#!/usr/bin/env node
/**
 * Fitness — Domain Purity (ADR-0011 §8, Wave 7).
 *
 * Scope: `src/domain/finance/**` (the only context fully under ADR-0011).
 * The PDF context uses tactical DDD and is intentionally NOT scanned here.
 *
 * Forbidden inside scope (production code; tests excluded):
 *  - UI / framework: react, react-dom, react-router*
 *  - Infrastructure: @supabase/*, supabase, fetch, axios, ky
 *  - Browser globals: window, document, localStorage, sessionStorage, navigator
 *  - Float-unsafe numerics: Math.round, Math.floor, Math.ceil, .toFixed(,
 *    parseFloat, Number.parseFloat
 *  - Non-deterministic identity: crypto.randomUUID, uuid, nanoid
 *  - Serialization at domain edge: JSON.stringify, JSON.parse
 *  - Time: Date( / Date.now / performance.now (must go through Instant port)
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { walk } from "./_lib/walk.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../..");
const SCOPE = resolve(ROOT, "src/domain/finance");
const OUT = resolve(__dirname, "../audits/output/fitness/check-domain-purity.json");
const TEST_RE = /\/(__tests__|__integration__|__mocks__)\//;

const BANS = [
  { re: /from\s+["']react(?:-dom|-router[^"']*)?["']/g, why: "UI framework import" },
  { re: /from\s+["']@supabase\/[^"']+["']/g, why: "Infrastructure import (@supabase)" },
  { re: /from\s+["'](?:supabase|axios|ky)["']/g, why: "Infrastructure HTTP client" },
  { re: /\bawait\s+fetch\s*\(/g, why: "await fetch(" },
  { re: /\bwindow\./g, why: "browser global: window" },
  { re: /\bdocument\./g, why: "browser global: document" },
  { re: /\blocalStorage\b/g, why: "browser global: localStorage" },
  { re: /\bsessionStorage\b/g, why: "browser global: sessionStorage" },
  { re: /\bnavigator\./g, why: "browser global: navigator" },
  { re: /\bMath\.(round|floor|ceil|trunc)\s*\(/g, why: "float-unsafe Math call" },
  { re: /\.toFixed\s*\(/g, why: ".toFixed(" },
  { re: /\bparseFloat\s*\(/g, why: "parseFloat(" },
  { re: /\bNumber\.parseFloat\s*\(/g, why: "Number.parseFloat(" },
  { re: /\bcrypto\.randomUUID\s*\(/g, why: "non-deterministic identity" },
  { re: /from\s+["'](uuid|nanoid)["']/g, why: "non-deterministic identity package" },
  { re: /\bJSON\.(stringify|parse)\s*\(/g, why: "JSON at domain edge" },
  { re: /\bnew\s+Date\s*\(/g, why: "raw Date()" },
  { re: /\bDate\.now\s*\(/g, why: "raw Date.now()" },
  { re: /\bperformance\.now\s*\(/g, why: "raw performance.now()" },
];

const violations = [];
let scannedFiles = 0;

for (const f of walk(SCOPE)) {
  const rel = relative(ROOT, f).split(sep).join("/");
  if (TEST_RE.test("/" + rel)) continue;
  scannedFiles++;
  const code = readFileSync(f, "utf8");
  const lines = code.split("\n");
  for (const { re, why } of BANS) {
    re.lastIndex = 0;
    for (const m of code.matchAll(re)) {
      // Compute 1-based line number.
      const before = code.slice(0, m.index);
      const line = before.split("\n").length;
      const src = (lines[line - 1] ?? "").trim();
      // Skip eslint-style line comments / block comments containing the pattern.
      const trimmed = src.replace(/\s+/g, " ");
      if (trimmed.startsWith("//") || trimmed.startsWith("*")) continue;
      violations.push({ file: rel, line, why, snippet: src.slice(0, 200) });
    }
  }
}

violations.sort(
  (a, b) =>
    a.file.localeCompare(b.file) || a.line - b.line || a.why.localeCompare(b.why),
);

const report = {
  schemaVersion: 1,
  fitness: "check-domain-purity",
  adr: "ADR-0011",
  scope: "src/domain/finance",
  scannedFiles,
  violations,
  pass: violations.length === 0,
};
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(report, null, 2) + "\n");
const status = report.pass ? "PASS" : "FAIL";
console.log(
  `[fitness:domain-purity] ${status} — scanned=${scannedFiles} violations=${violations.length}`,
);
if (!report.pass) {
  for (const v of violations)
    console.log(`  ${v.file}:${v.line} — ${v.why} :: ${v.snippet}`);
  process.exit(1);
}
