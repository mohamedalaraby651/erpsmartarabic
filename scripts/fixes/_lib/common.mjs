/**
 * Shared helpers for scripts/fixes/**.
 * All fix scripts are idempotent and default to --dry-run.
 */
import { readdirSync, readFileSync, writeFileSync, statSync, mkdirSync } from "node:fs";
import { join, extname, relative } from "node:path";

export const ROOT = process.cwd();
export const SRC = join(ROOT, "src");
export const OUT = join(ROOT, "scripts/audits/output/wave2-fixes");

export const DEFAULT_EXCLUDE_DIRS = [
  "src/kernel",
  "src/platform",
  "src/ui/tokens",
  "src/components/ui-kit",
];
export const DEFAULT_EXCLUDE_FILES = new Set(["src/index.css"]);

export function walk(dir, exts, excludeDirs = DEFAULT_EXCLUDE_DIRS, acc = []) {
  for (const name of readdirSync(dir)) {
    if (name.startsWith(".")) continue;
    const full = join(dir, name);
    const rel = relative(ROOT, full).replace(/\\/g, "/");
    if (excludeDirs.some((d) => rel === d || rel.startsWith(d + "/"))) continue;
    if (rel.includes("__tests__") || rel.includes("__demo__")) continue;
    const s = statSync(full);
    if (s.isDirectory()) walk(full, exts, excludeDirs, acc);
    else if (exts.has(extname(name)) && !DEFAULT_EXCLUDE_FILES.has(rel)) acc.push(rel);
  }
  return acc;
}

export function readArgs() {
  const args = process.argv.slice(2);
  return { write: args.includes("--write"), verbose: args.includes("--verbose") };
}

export function writeReport(name, data) {
  mkdirSync(OUT, { recursive: true });
  writeFileSync(join(OUT, name), JSON.stringify(data, null, 2));
}

export function applyEdit(rel, next, write) {
  if (!write) return false;
  writeFileSync(join(ROOT, rel), next);
  return true;
}

export function loadFile(rel) {
  return readFileSync(join(ROOT, rel), "utf8");
}
