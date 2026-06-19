#!/usr/bin/env node
// scripts/audits/complexity-report.mjs
// UX-0: Heuristic cyclomatic complexity + maintainability proxy.
// Counts decision points per file as a deterministic, dependency-free proxy
// (per-function precision is deferred to a real tool in UX-1).
import { mkdirSync, writeFileSync, readdirSync, readFileSync } from "node:fs";
import { dirname, resolve, relative } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../..");
const SRC = resolve(ROOT, "src");
const OUT = resolve(__dirname, "output/complexity-report.json");

function walk(dir, out = []) {
  for (const e of readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const p = resolve(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === "node_modules" || e.name === "__tests__" || e.name === "test") continue;
      walk(p, out);
    } else if (/\.(tsx?)$/.test(e.name) && !e.name.endsWith(".d.ts")) {
      out.push(p);
    }
  }
  return out;
}

const DECISION = /\b(if|else if|case|for|while|do|catch|\?\?|\?\.|&&|\|\|)\b|\?[^:]+:/g;
const FN_HEAD = /\b(function\b|=>|\bmethod\b)/g;

const files = walk(SRC);
const rows = [];
for (const f of files) {
  const code = readFileSync(f, "utf8");
  const decisions = (code.match(DECISION) ?? []).length;
  const fns = Math.max(1, (code.match(FN_HEAD) ?? []).length);
  const loc = code.split("\n").length;
  const fileCC = 1 + decisions;             // file-level total CC
  const perFnCC = Math.max(1, Math.round(decisions / fns) + 1);
  rows.push({ file: relative(ROOT, f), loc, fileCyclomatic: fileCC, avgFnCyclomatic: perFnCC });
}
rows.sort((a, b) => a.file.localeCompare(b.file));
function pct(arr, p) { if (!arr.length) return 0; const i = Math.min(arr.length - 1, Math.floor((p / 100) * arr.length)); return arr[i]; }

// crude maintainability index proxy: 171 − 5.2·ln(volume) − 0.23·CC − 16.2·ln(loc)
const mi = rows.map(r => {
  const v = Math.log(Math.max(1, r.loc * 10));
  return Math.max(0, Math.min(100, 171 - 5.2 * v - 0.23 * r.maxCyclomatic - 16.2 * Math.log(Math.max(1, r.loc))));
});
const miAvg = mi.length ? +(mi.reduce((a, b) => a + b, 0) / mi.length).toFixed(2) : 0;

const report = {
  schemaVersion: 1,
  baselineVersion: "UX-0",
  filesAnalyzed: rows.length,
  cyclomatic: {
    max: cycMax[cycMax.length - 1] ?? 0,
    p50: pct(cycMax, 50),
    p90: pct(cycMax, 90),
    p95: pct(cycMax, 95),
    p99: pct(cycMax, 99),
  },
  maintainabilityIndexAvg: miAvg,
  top20MostComplex: [...rows].sort((a, b) => b.maxCyclomatic - a.maxCyclomatic || a.file.localeCompare(b.file)).slice(0, 20),
};

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(report, null, 2) + "\n");
console.log(`[complexity] ${rows.length} files, p95 CC=${report.cyclomatic.p95}, MI=${miAvg} → ${OUT}`);
