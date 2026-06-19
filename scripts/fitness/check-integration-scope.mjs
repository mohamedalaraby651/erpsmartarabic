#!/usr/bin/env node
/**
 * Fitness — Integration scope (UX-1E, invariants E1/E3/E4/E5/E6).
 *
 * Enforces:
 *   E1 — Mock domain has zero real-data-layer deps.
 *   E3 — Spike never leaks to public surface (`src/ui/index.ts`).
 *   E4 — Harness is dev-only (App.tsx mounts route behind import.meta.env.DEV).
 *   E5 — Mock data deterministic (no Date.now / Math.random / crypto.randomUUID under mocks/**).
 *   E6 — Manifest schema + fingerprint locked.
 */
import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../..");
const OUT = resolve(__dirname, "../audits/output/fitness/check-integration-scope.json");
const SCAN = resolve(ROOT, "src/ui/__integration__");

const FORBIDDEN_GLOBAL = [
  { pattern: /from\s+["']@\/lib\/repositories\//, why: "repository import in spike" },
  { pattern: /from\s+["']@\/lib\/queries\//, why: "query-layer import in spike" },
  { pattern: /from\s+["']@\/integrations\/supabase/, why: "supabase import in spike" },
  { pattern: /from\s+["']@supabase\//, why: "supabase import in spike" },
  { pattern: /from\s+["']@tanstack\/react-query["']/, why: "react-query import in spike" },
  { pattern: /from\s+["']axios["']/, why: "axios import in spike" },
  { pattern: /from\s+["']zod["']/, why: "zod import in spike (Invariant E1)" },
];

const FORBIDDEN_IN_ADAPTERS = [
  { pattern: /\bfetch\s*\(/, why: "raw fetch in adapter" },
];

const FORBIDDEN_IN_MOCKS = [
  { pattern: /\bDate\.now\s*\(/, why: "Date.now() in mocks/** (E5)" },
  { pattern: /\bMath\.random\s*\(/, why: "Math.random() in mocks/** (E5)" },
  { pattern: /crypto\.randomUUID\s*\(/, why: "crypto.randomUUID() in mocks/** (E5)" },
];

function walk(dir, out = []) {
  let entries;
  try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const p = resolve(dir, e.name);
    if (e.isDirectory()) {
      if (["__tests__", "__demo__"].includes(e.name)) continue;
      walk(p, out);
    } else if (/\.(tsx?|mts|cts)$/.test(e.name) && !e.name.endsWith(".d.ts")) {
      out.push(p);
    }
  }
  return out;
}

const files = walk(SCAN);
const violations = [];

function stripComments(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:"'`\\])\/\/[^\n]*/g, "$1");
}

for (const f of files) {
  const rel = relative(ROOT, f).split(sep).join("/");
  const raw = readFileSync(f, "utf8");
  const code = stripComments(raw);
  for (const r of FORBIDDEN_GLOBAL) if (r.pattern.test(code)) violations.push({ file: rel, why: r.why });
  if (rel.includes("/adapters/")) {
    for (const r of FORBIDDEN_IN_ADAPTERS) if (r.pattern.test(code)) violations.push({ file: rel, why: r.why });
  }
  if (rel.includes("/mocks/")) {
    for (const r of FORBIDDEN_IN_MOCKS) if (r.pattern.test(code)) violations.push({ file: rel, why: r.why });
  }
}

// E3 — public surface must not re-export the spike.
const indexPath = resolve(ROOT, "src/ui/index.ts");
if (existsSync(indexPath)) {
  const idx = readFileSync(indexPath, "utf8");
  if (/__integration__/.test(idx)) {
    violations.push({ file: "src/ui/index.ts", why: "spike re-exported from public surface (E3)" });
  }
}

// E4 — App.tsx must mount the harness route only behind import.meta.env.DEV.
const appPath = resolve(ROOT, "src/App.tsx");
if (existsSync(appPath)) {
  const app = readFileSync(appPath, "utf8");
  if (app.includes("__integration__/ux1e")) {
    const block = app.split("__integration__/ux1e")[0];
    const lastDev = block.lastIndexOf("import.meta.env.DEV");
    const lastNotDev = block.lastIndexOf(": null}");
    if (lastDev < 0 || lastDev < lastNotDev) {
      violations.push({ file: "src/App.tsx", why: "harness route not gated by import.meta.env.DEV (E4)" });
    }
  } else {
    violations.push({ file: "src/App.tsx", why: "harness route missing (E4)" });
  }
}

// E6 — manifest schema + fingerprint locked.
const manifestPath = resolve(SCAN, "integration.manifest.ts");
if (existsSync(manifestPath)) {
  const m = readFileSync(manifestPath, "utf8");
  if (!/manifestSchema:\s*1\b/.test(m)) violations.push({ file: "src/ui/__integration__/integration.manifest.ts", why: "manifestSchema !== 1 (E6)" });
  if (!/fingerprint:\s*"ux1e-v3"/.test(m)) violations.push({ file: "src/ui/__integration__/integration.manifest.ts", why: "fingerprint !== ux1e-v3 (E6)" });
  for (const flag of ["frozenContracts", "disposable", "devOnly"]) {
    const re = new RegExp(`${flag}:\\s*true\\b`);
    if (!re.test(m)) violations.push({ file: "src/ui/__integration__/integration.manifest.ts", why: `${flag} must be literal true (E6)` });
  }
} else {
  violations.push({ file: "src/ui/__integration__/integration.manifest.ts", why: "manifest missing (E6)" });
}

violations.sort((a, b) => a.file.localeCompare(b.file) || a.why.localeCompare(b.why));

const report = {
  schemaVersion: 1,
  fitness: "check-integration-scope",
  baselineVersion: "UX-1E",
  scannedFiles: files.length,
  violations,
  pass: violations.length === 0,
};
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(report, null, 2) + "\n");
const status = report.pass ? "PASS" : "FAIL";
console.log(`[fitness:integration-scope] ${status} — scanned=${files.length} violations=${violations.length}`);
if (!report.pass) {
  for (const v of violations) console.log(`  ${v.file} — ${v.why}`);
  process.exit(1);
}
