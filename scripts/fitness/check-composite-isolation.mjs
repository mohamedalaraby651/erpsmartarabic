#!/usr/bin/env node
/**
 * Fitness — Composite isolation.
 *
 * Files under `src/ui/composites/**` MUST NOT import from Shell internals,
 * data layer, query layer, or any runtime IO module. Composites compose
 * primitives + contracts only.
 */
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../..");
const OUT = resolve(__dirname, "../audits/output/fitness/check-composite-isolation.json");
const SCAN = resolve(ROOT, "src/ui/composites");

const FORBIDDEN = [
  { pattern: /from\s+["']@\/ui\/layout(?:\/|["'])/, why: "Shell layout import in composite" },
  { pattern: /from\s+["']@\/ui\/providers(?:\/|["'])/, why: "Shell provider import in composite" },
  { pattern: /from\s+["']@\/ui\/hooks(?:\/|["'])/, why: "Shell hook import in composite" },
  { pattern: /from\s+["']@\/integrations\//, why: "integration import in composite" },
  { pattern: /from\s+["']@\/lib\/repositories\//, why: "repository import in composite" },
  { pattern: /from\s+["']@\/lib\/queries\//, why: "query-layer import in composite" },
  { pattern: /from\s+["']@supabase\//, why: "supabase import in composite" },
  { pattern: /from\s+["']@tanstack\/react-query["']/, why: "react-query import in composite" },
  { pattern: /from\s+["']axios["']/, why: "axios import in composite" },
  { pattern: /from\s+["']zod["']/, why: "zod import in composite (Invariant C8 violated)" },
  { pattern: /\bfetch\s*\(/, why: "raw fetch in composite" },
];

function walk(dir, out = []) {
  let entries;
  try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const p = resolve(dir, e.name);
    if (e.isDirectory()) {
      if (["__tests__", "__demo__", "_internal"].includes(e.name)) continue;
      walk(p, out);
    } else if (/\.(tsx?|mts|cts)$/.test(e.name) && !e.name.endsWith(".d.ts")) {
      out.push(p);
    }
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
  fitness: "check-composite-isolation",
  baselineVersion: "UX-1",
  scannedFiles: files.length,
  violations,
  pass: violations.length === 0,
};
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(report, null, 2) + "\n");
const status = report.pass ? "PASS" : "FAIL";
console.log(`[fitness:composite-isolation] ${status} — scanned=${files.length} violations=${violations.length}`);
if (!report.pass) {
  for (const v of violations) console.log(`  ${v.file} — ${v.why}`);
  process.exit(1);
}
