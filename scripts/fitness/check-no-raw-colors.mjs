#!/usr/bin/env node
/**
 * check-no-raw-colors.mjs — Wave 2 fitness (warn mode).
 * Feature code must reference colors via HSL CSS vars (Tailwind roles).
 * Raw `#hex`, `rgb(`, `hsl(...)` literals in TS/TSX are flagged.
 *
 * Mode: warn (exits 0) at Wave 2 open; flips to enforcing (exits 1) at
 * Wave 2 close.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, extname, relative } from "node:path";

const ROOT = process.cwd();
const SRC = join(ROOT, "src");
const ENFORCING = process.env.CHECK_NO_RAW_COLORS_ENFORCE === "1";
const EXCLUDE = ["src/ui/tokens", "src/kernel", "src/platform", "src/integrations/supabase"];
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

const violations = [];
for (const rel of walk(SRC)) {
  const src = readFileSync(join(ROOT, rel), "utf8");
  const lines = src.split("\n");
  lines.forEach((line, i) => {
    // Skip comments quickly
    if (/^\s*(\/\/|\*|\/\*)/.test(line)) return;
    if (RE.test(line)) violations.push({ file: rel, line: i + 1, snippet: line.trim().slice(0, 120) });
  });
}

const mode = ENFORCING ? "ENFORCING" : "WARN";
console.log(`[check-no-raw-colors] ${mode} — ${violations.length} violations`);
for (const v of violations.slice(0, 25)) console.log(`  ${v.file}:${v.line}  ${v.snippet}`);
if (violations.length > 25) console.log(`  … (${violations.length - 25} more)`);
process.exit(ENFORCING && violations.length ? 1 : 0);
