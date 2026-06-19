#!/usr/bin/env node
/**
 * Fitness — Primitive isolation.
 *
 * Files under `src/ui/primitives/**` MUST NOT import from the Shell layer.
 * Enforces ADR-0003 boundary: primitives are workspace-agnostic and
 * Shell-independent presentation units.
 */
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../..");
const OUT = resolve(
  __dirname,
  "../audits/output/fitness/check-primitive-isolation.json",
);
const SCAN = resolve(ROOT, "src/ui/primitives");

const FORBIDDEN = [
  { pattern: /from\s+["']@\/ui\/layout(?:\/|["'])/, why: "Shell layout import in primitive" },
  { pattern: /from\s+["']@\/ui\/providers(?:\/|["'])/, why: "Shell provider import in primitive" },
  { pattern: /from\s+["']@\/ui\/hooks(?:\/|["'])/, why: "Shell hook import in primitive" },
  { pattern: /from\s+["']\.\.\/layout\//, why: "Shell layout import in primitive (relative)" },
  { pattern: /from\s+["']\.\.\/providers\//, why: "Shell provider import in primitive (relative)" },
  { pattern: /from\s+["']\.\.\/hooks\//, why: "Shell hook import in primitive (relative)" },
  { pattern: /from\s+["']@\/integrations\//, why: "integration import in primitive" },
  { pattern: /from\s+["']@\/lib\/repositories\//, why: "repository import in primitive" },
  { pattern: /from\s+["']@supabase\//, why: "supabase import in primitive" },
];

function walk(dir, out = []) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const p = resolve(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.(tsx?|mts|cts)$/.test(e.name) && !e.name.endsWith(".d.ts"))
      out.push(p);
  }
  return out;
}

const files = walk(SCAN);
const violations = [];
for (const f of files) {
  const rel = relative(ROOT, f).split(sep).join("/");
  const code = readFileSync(f, "utf8");
  for (const rule of FORBIDDEN) {
    if (rule.pattern.test(code)) violations.push({ file: rel, why: rule.why });
  }
}
violations.sort((a, b) => a.file.localeCompare(b.file) || a.why.localeCompare(b.why));

const report = {
  schemaVersion: 1,
  fitness: "check-primitive-isolation",
  baselineVersion: "UX-1",
  scannedFiles: files.length,
  violations,
  pass: violations.length === 0,
};
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(report, null, 2) + "\n");
const status = report.pass ? "PASS" : "FAIL";
console.log(
  `[fitness:primitive-isolation] ${status} — scanned=${files.length} violations=${violations.length}`,
);
if (!report.pass) {
  for (const v of violations) console.log(`  ${v.file} — ${v.why}`);
  process.exit(1);
}
