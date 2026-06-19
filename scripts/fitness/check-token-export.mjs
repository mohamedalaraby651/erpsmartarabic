#!/usr/bin/env node
/**
 * Fitness function — Token Single Public API.
 *
 * Enforces:
 *   1. `src/ui/tokens/*.ts` (other than `index.ts`) must be re-exported by
 *      `src/ui/tokens/index.ts`.
 *   2. No file outside `src/ui/tokens/` may import individual token modules
 *      (e.g. `@/ui/tokens/colors`). The only allowed entry point is
 *      `@/ui/tokens` or `@/ui` (which re-exports tokens).
 *
 * Deterministic output written to
 *   scripts/audits/output/fitness/check-token-export.json
 * and a human summary printed to stdout. Non-zero exit code on violation.
 */
import { readdirSync, readFileSync, statSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../..");
const SRC = resolve(ROOT, "src");
const TOKENS_DIR = resolve(SRC, "ui/tokens");
const OUT = resolve(__dirname, "../audits/output/fitness/check-token-export.json");

function walk(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const p = resolve(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules") continue;
      walk(p, out);
    } else if (/\.(tsx?|mts|cts)$/.test(entry.name) && !entry.name.endsWith(".d.ts")) {
      out.push(p);
    }
  }
  return out;
}

const tokenFiles = readdirSync(TOKENS_DIR)
  .filter((f) => /\.ts$/.test(f) && f !== "index.ts")
  .sort();

const indexSource = readFileSync(resolve(TOKENS_DIR, "index.ts"), "utf8");

const missingReExports = tokenFiles.filter((f) => {
  const base = f.replace(/\.ts$/, "");
  const re = new RegExp(`from\\s+["']\\.\\/${base}["']`);
  return !re.test(indexSource);
});

const allFiles = walk(SRC).map((p) => relative(ROOT, p).split(sep).join("/")).sort();
const tokenModuleRegex = /from\s+["']@\/ui\/tokens\/([a-zA-Z0-9_-]+)["']/g;
const violations = [];

for (const file of allFiles) {
  if (file.startsWith("src/ui/tokens/")) continue;
  const code = readFileSync(resolve(ROOT, file), "utf8");
  for (const match of code.matchAll(tokenModuleRegex)) {
    violations.push({ file, importedModule: match[1] });
  }
}

const report = {
  schemaVersion: 1,
  fitness: "check-token-export",
  baselineVersion: "UX-1",
  tokenFiles,
  missingReExports,
  deepImports: violations,
  pass: missingReExports.length === 0 && violations.length === 0,
};

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(report, null, 2) + "\n");

const status = report.pass ? "PASS" : "FAIL";
console.log(`[fitness:token-export] ${status} — missing=${missingReExports.length} deepImports=${violations.length}`);
if (!report.pass) {
  if (missingReExports.length) console.log("  missing re-exports:", missingReExports.join(", "));
  for (const v of violations) console.log(`  deep import: ${v.file} → @/ui/tokens/${v.importedModule}`);
  process.exit(1);
}
