#!/usr/bin/env node
// scripts/audits/lint-types-classify.mjs
// UX-0: as-any, console.*, tsc errors, ESLint counts.
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync, readFileSync, readdirSync } from "node:fs";
import { dirname, resolve, relative } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../..");
const SRC = resolve(ROOT, "src");
const OUT = resolve(__dirname, "output/lint-types-report.json");

function walk(dir, out = []) {
  for (const e of readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const p = resolve(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === "node_modules") continue;
      walk(p, out);
    } else if (/\.(tsx?|jsx?)$/.test(e.name) && !e.name.endsWith(".d.ts")) {
      out.push(p);
    }
  }
  return out;
}

const files = walk(SRC).map(p => relative(ROOT, p)).sort();

function classifyAsAny(file) {
  if (file.includes("__tests__") || file.includes("/test/") || /\.test\.tsx?$/.test(file)) return "tests";
  if (file.startsWith("src/integrations/")) return "generated";
  if (file.startsWith("src/lib/repositories/") || file.startsWith("src/lib/queries/") || file.startsWith("src/lib/services/")) return "infrastructure";
  if (file.startsWith("src/components/") || file.startsWith("src/pages/") || file.startsWith("src/hooks/")) return "ui";
  return "legacy";
}
function classifyConsole(line) {
  // Explicit opt-in markers win over heuristics.
  if (/\/\/\s*allow-console:\s*(sink|logger|infra)/i.test(line)) return "telemetry";
  if (/\/\/\s*ts-ignore|telemetry|track|metric/i.test(line)) return "telemetry";
  // Dev-guarded debug helpers are an allowed exception (UX-1A policy).
  if (/import\.meta\.env\.DEV|process\.env\.NODE_ENV/.test(line)) return "debug";
  if (/catch|error|fail|warn/i.test(line)) return "error-handler";
  if (/debug|todo|fixme|temp/i.test(line)) return "debug";
  return "leftover";
}

const asAnyByCat = { infrastructure: 0, ui: 0, tests: 0, legacy: 0, generated: 0 };
const consoleByCat = { debug: 0, "error-handler": 0, telemetry: 0, leftover: 0 };
const asAnySamples = [];
const consoleSamples = [];
let asAnyTotal = 0, consoleTotal = 0;

for (const f of files) {
  const code = readFileSync(resolve(ROOT, f), "utf8");
  const lines = code.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // as any (skip "as anyOtherWord")
    const anyMatches = line.match(/\bas\s+any\b/g);
    if (anyMatches) {
      const cat = classifyAsAny(f);
      asAnyByCat[cat] += anyMatches.length;
      asAnyTotal += anyMatches.length;
      if (asAnySamples.length < 30) asAnySamples.push({ file: f, line: i + 1, code: line.trim().slice(0, 160), category: cat });
    }
    const conMatches = line.match(/\bconsole\.(log|warn|error|info|debug|trace)\b/g);
    if (conMatches) {
      // Inspect a 3-line window so block-scope DEV guards / allow-console
      // markers on the previous line are recognised.
      const context = [lines[i - 2] ?? "", lines[i - 1] ?? "", line].join("\n");
      const cat = classifyConsole(context);
      consoleByCat[cat] += conMatches.length;
      consoleTotal += conMatches.length;
      if (consoleSamples.length < 30) consoleSamples.push({ file: f, line: i + 1, code: line.trim().slice(0, 160), category: cat });
    }
  }
}

// tsc
let tscErrors = 0, tscOutput = "";
try {
  tscOutput = execFileSync("bunx", ["tsc", "--noEmit"], { cwd: ROOT, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
} catch (e) {
  tscOutput = (e.stdout?.toString() ?? "") + (e.stderr?.toString() ?? "");
  tscErrors = (tscOutput.match(/^.+error TS\d+:/gm) ?? []).length;
}

// ESLint (warnings + errors)
let eslintErrors = 0, eslintWarnings = 0;
try {
  const raw = execFileSync("bun", ["run", "lint", "--", "-f", "json"], { cwd: ROOT, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  const arr = JSON.parse(raw.slice(raw.indexOf("[")));
  for (const r of arr) { eslintErrors += r.errorCount; eslintWarnings += r.warningCount; }
} catch (e) {
  try {
    const out = (e.stdout?.toString() ?? "");
    const arr = JSON.parse(out.slice(out.indexOf("[")));
    for (const r of arr) { eslintErrors += r.errorCount; eslintWarnings += r.warningCount; }
  } catch { /* ignore */ }
}

const report = {
  schemaVersion: 1,
  baselineVersion: "UX-0",
  asAny: { total: asAnyTotal, byCategory: asAnyByCat, samples: asAnySamples },
  console: { total: consoleTotal, byCategory: consoleByCat, samples: consoleSamples },
  typescript: { strictErrors: tscErrors, hardStopTriggered: tscErrors > 0 },
  eslint: { errors: eslintErrors, warnings: eslintWarnings },
};

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(report, null, 2) + "\n");
console.log(`[lint-types] asAny=${asAnyTotal} console=${consoleTotal} tsc=${tscErrors} eslint(e/w)=${eslintErrors}/${eslintWarnings} → ${OUT}`);
