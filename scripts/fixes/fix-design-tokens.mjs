#!/usr/bin/env node
/**
 * fix-design-tokens.mjs — Wave 2 Closure Phase B.
 * Rewrites known hex/rgb literals to semantic token expressions using
 * scripts/fixes/_maps/color-map.json. Unknown literals are collected in
 * unmapped.json for manual review.
 * Default: --dry-run. Pass --write to persist.
 */
import { walk, readArgs, writeReport, applyEdit, loadFile, SRC } from "./_lib/common.mjs";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const { write } = readArgs();
const map = JSON.parse(readFileSync(join(process.cwd(), "scripts/fixes/_maps/color-map.json"), "utf8"));
const HEX_RE = /#[0-9a-fA-F]{3,8}\b/g;
const RGB_RE = /rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)/g;

const changes = [];
const unmapped = { hex: new Set(), rgb: new Set() };

for (const rel of walk(SRC, new Set([".ts", ".tsx", ".css"]))) {
  const src = loadFile(rel);
  let next = src;
  let touched = false;

  next = next.replace(HEX_RE, (m) => {
    const key = m.toLowerCase();
    if (map.hex[key]) { touched = true; return map.hex[key]; }
    unmapped.hex.add(key); return m;
  });
  next = next.replace(RGB_RE, (m) => {
    const key = m.replace(/\s+/g, "").toLowerCase();
    if (map.rgb[key]) { touched = true; return map.rgb[key]; }
    unmapped.rgb.add(key); return m;
  });

  if (touched) {
    changes.push(rel);
    applyEdit(rel, next, write);
  }
}

writeReport("fix-design-tokens.json", {
  mode: write ? "write" : "dry-run",
  changedFiles: changes,
  unmapped: { hex: [...unmapped.hex], rgb: [...unmapped.rgb] },
});
console.log(`[fix-design-tokens] ${write ? "wrote" : "would write"} ${changes.length} files; unmapped: ${unmapped.hex.size} hex, ${unmapped.rgb.size} rgb`);
