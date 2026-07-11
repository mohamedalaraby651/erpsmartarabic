#!/usr/bin/env node
/**
 * check-no-raw-colors.mjs — Wave 2 fitness.
 * Feature code must reference colors via HSL CSS vars (Tailwind roles).
 * Raw `#hex`, `rgb(`, `hsl(...)` literals in TS/TSX are flagged.
 *
 * Enforcement model: allowlist-freeze (same shape as
 * `check-no-new-ui-kit-imports`). Files present in the pinned allowlist
 * hold pre-existing violations (user-configurable brand pickers, chart
 * palettes, live-preview HTML) — they are permitted but frozen; NEW
 * violators fail the check.
 *
 * Allowlist: scripts/audits/output/wave2-discovery/raw-colors-allowlist.json
 * Modes:
 *   warn (default): reports diff, exit 0.
 *   enforcing (CHECK_NO_RAW_COLORS_ENFORCE=1): fails if any new file
 *     outside the allowlist has raw color literals.
 */
import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { join, extname, relative } from "node:path";

const ROOT = process.cwd();
const SRC = join(ROOT, "src");
const ENFORCING = process.env.CHECK_NO_RAW_COLORS_ENFORCE === "1";
const ALLOWLIST_PATH = join(
  ROOT,
  "scripts/audits/output/wave2-discovery/raw-colors-allowlist.json",
);
const EXCLUDE = [
  "src/ui/tokens",
  "src/kernel",
  "src/platform",
  "src/integrations/supabase",
  // PDF/print output rendered by an external engine outside the app theme —
  // must ship concrete colors. See ADR-0028 §Print-Exempt.
  "src/lib/pdf",
  "src/components/print",
];
const EXTS = new Set([".ts", ".tsx"]);
const RE = /(#[0-9a-fA-F]{3,8}\b|\brgba?\(\s*\d|\bhsla?\(\s*\d)/;

function walk(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    if (name.startsWith(".")) continue;
    const full = join(dir, name);
    const rel = relative(ROOT, full).replace(/\\/g, "/");
    if (EXCLUDE.some((d) => rel === d || rel.startsWith(d + "/"))) continue;
    if (rel.includes("__tests__") || rel.includes("__demo__")) continue;
    const s = statSync(full);
    if (s.isDirectory()) walk(full, acc);
    else if (EXTS.has(extname(name))) acc.push(rel);
  }
  return acc;
}

const allowlist = new Set(
  existsSync(ALLOWLIST_PATH) ? JSON.parse(readFileSync(ALLOWLIST_PATH, "utf8")) : [],
);

const offenders = new Set();
for (const rel of walk(SRC)) {
  const src = readFileSync(join(ROOT, rel), "utf8");
  const lines = src.split("\n");
  for (const line of lines) {
    if (/^\s*(\/\/|\*|\/\*)/.test(line)) continue;
    if (RE.test(line)) {
      offenders.add(rel);
      break;
    }
  }
}
const newOffenders = [...offenders].filter((f) => !allowlist.has(f)).sort();

const mode = ENFORCING ? "ENFORCING" : "WARN";
console.log(
  `[check-no-raw-colors] ${mode} — allowlist=${allowlist.size} current=${offenders.size} new=${newOffenders.length}`,
);
for (const f of newOffenders.slice(0, 25)) console.log(`  NEW: ${f}`);
process.exit(ENFORCING && newOffenders.length ? 1 : 0);
