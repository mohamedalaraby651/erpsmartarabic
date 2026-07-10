#!/usr/bin/env node
/**
 * fix-spacing.mjs — Wave 2 Closure Phase B.
 * Snaps `p-[Npx]`, `m-[Npx]`, `gap-[Npx]` to the nearest Tailwind 4-pt step
 * (Npx / 4 → tailwind unit). Emits `deferred` entries when snap delta > 2px.
 */
import { walk, readArgs, writeReport, applyEdit, loadFile, SRC } from "./_lib/common.mjs";

const { write } = readArgs();
const RE = /\b([pm][trblxy]?|gap[xy]?)-\[(\d+)px\]/g;

const changes = [];
const deferred = [];

for (const rel of walk(SRC, new Set([".ts", ".tsx"]))) {
  const src = loadFile(rel);
  let touched = false;
  const next = src.replace(RE, (full, prefix, pxStr) => {
    const px = Number(pxStr);
    const step = Math.round(px / 4);
    const snapped = step * 4;
    const delta = Math.abs(snapped - px);
    if (delta > 2) { deferred.push({ file: rel, token: full, px, snapped }); return full; }
    touched = true;
    return `${prefix}-${step}`;
  });
  if (touched) { changes.push(rel); applyEdit(rel, next, write); }
}

writeReport("fix-spacing.json", { mode: write ? "write" : "dry-run", changedFiles: changes, deferred });
console.log(`[fix-spacing] ${write ? "wrote" : "would write"} ${changes.length} files; ${deferred.length} deferred`);
