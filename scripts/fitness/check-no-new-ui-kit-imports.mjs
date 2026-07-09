#!/usr/bin/env node
/**
 * check-no-new-ui-kit-imports.mjs — Wave 2 fitness (warn mode).
 * Blocks NEW imports of `@/components/ui-kit/**` outside a pinned
 * allowlist. The allowlist is produced by `ui-kit-usage.mjs` and
 * committed as `scripts/audits/output/wave2-discovery/ui-kit-allowlist.json`.
 *
 * Modes:
 *   warn (default): reports diff, exit 0.
 *   enforcing (CHECK_NO_NEW_UIKIT_ENFORCE=1): fails on any new importer.
 */
import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { join, extname, relative } from "node:path";

const ROOT = process.cwd();
const SRC = join(ROOT, "src");
const ENFORCING = process.env.CHECK_NO_NEW_UIKIT_ENFORCE === "1";
const ALLOWLIST_PATH = join(ROOT, "scripts/audits/output/wave2-discovery/ui-kit-allowlist.json");
const IMPORT_RE = /from\s+["']@\/components\/ui-kit(?:\/[^"']*)?["']/;
const EXTS = new Set([".ts", ".tsx"]);

function walk(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    if (name.startsWith(".")) continue;
    const full = join(dir, name);
    const rel = relative(ROOT, full).replace(/\\/g, "/");
    if (rel === "src/components/ui-kit" || rel.startsWith("src/components/ui-kit/")) continue;
    const s = statSync(full);
    if (s.isDirectory()) walk(full, acc);
    else if (EXTS.has(extname(name))) acc.push(rel);
  }
  return acc;
}

const allowlist = new Set(existsSync(ALLOWLIST_PATH) ? JSON.parse(readFileSync(ALLOWLIST_PATH, "utf8")) : []);
const current = [];
for (const rel of walk(SRC)) {
  const src = readFileSync(join(ROOT, rel), "utf8");
  if (IMPORT_RE.test(src)) current.push(rel);
}
const newImporters = current.filter((f) => !allowlist.has(f));

const mode = ENFORCING ? "ENFORCING" : "WARN";
console.log(`[check-no-new-ui-kit-imports] ${mode} — allowlist=${allowlist.size} current=${current.length} new=${newImporters.length}`);
for (const f of newImporters.slice(0, 25)) console.log(`  NEW: ${f}`);
process.exit(ENFORCING && newImporters.length ? 1 : 0);
