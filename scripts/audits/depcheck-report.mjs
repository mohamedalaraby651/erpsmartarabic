#!/usr/bin/env node
// scripts/audits/depcheck-report.mjs
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../..");
const OUT = resolve(__dirname, "output/depcheck-report.json");

let raw = "{}";
try {
  raw = execFileSync("bunx", ["depcheck", "--json"], { cwd: ROOT, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
} catch (e) {
  // depcheck exits non-zero when it finds issues; capture stdout anyway
  raw = e.stdout?.toString() ?? "{}";
}
const data = JSON.parse(raw);

// normalize + sort
function sortObj(o) {
  if (!o || typeof o !== "object") return o;
  if (Array.isArray(o)) return [...o].sort();
  const out = {};
  for (const k of Object.keys(o).sort()) out[k] = sortObj(o[k]);
  return out;
}

const report = {
  schemaVersion: 1,
  baselineVersion: "UX-0",
  unusedDependencies: (data.dependencies ?? []).sort(),
  unusedDevDependencies: (data.devDependencies ?? []).sort(),
  missing: sortObj(data.missing ?? {}),
  invalidFiles: sortObj(data.invalidFiles ?? {}),
  invalidDirs: sortObj(data.invalidDirs ?? {}),
};

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(report, null, 2) + "\n");
console.log(`[depcheck] unused=${report.unusedDependencies.length} unusedDev=${report.unusedDevDependencies.length} → ${OUT}`);
