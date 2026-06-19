#!/usr/bin/env node
// scripts/audits/complexity-report.mjs
// UX-0: Cyclomatic complexity / maintainability via ts-complex.
import { execFileSync } from "node:child_process";
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

const files = walk(SRC);
const rows = [];

for (const f of files) {
  try {
    const raw = execFileSync("bunx", ["ts-complex", "cyclomatic", f], {
      cwd: ROOT, encoding: "utf8", maxBuffer: 8 * 1024 * 1024, stdio: ["ignore", "pipe", "ignore"],
    });
    // ts-complex prints lines; parse numbers
    const nums = [...raw.matchAll(/\b(\d+)\b/g)].map(m => +m[1]);
    const max = nums.length ? Math.max(...nums) : 0;
    const sum = nums.reduce((a, b) => a + b, 0);
    const code = readFileSync(f, "utf8");
    const loc = code.split("\n").length;
    rows.push({ file: relative(ROOT, f), loc, maxCyclomatic: max, sumCyclomatic: sum });
  } catch {
    // skip files ts-complex cannot parse
  }
}

rows.sort((a, b) => a.file.localeCompare(b.file));
const cycMax = rows.map(r => r.maxCyclomatic).sort((a, b) => a - b);
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
