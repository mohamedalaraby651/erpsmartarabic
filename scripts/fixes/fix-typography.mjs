#!/usr/bin/env node
/**
 * fix-typography.mjs — Wave 2 Closure Phase B.
 * Rewrites hardcoded `font-family:` and `box-shadow:` to design tokens.
 */
import { walk, readArgs, writeReport, applyEdit, loadFile, SRC } from "./_lib/common.mjs";

const { write } = readArgs();
const FF_RE = /font-family\s*:\s*[^;]+;/gi;
const BS_RE = /box-shadow\s*:\s*(?!var\()[^;]+;/gi;

const changes = [];
for (const rel of walk(SRC, new Set([".ts", ".tsx", ".css"]))) {
  const src = loadFile(rel);
  let next = src;
  let touched = false;
  next = next.replace(FF_RE, () => { touched = true; return `font-family: var(--font-sans);`; });
  next = next.replace(BS_RE, () => { touched = true; return `box-shadow: var(--shadow-md);`; });
  if (touched) { changes.push(rel); applyEdit(rel, next, write); }
}

writeReport("fix-typography.json", { mode: write ? "write" : "dry-run", changedFiles: changes });
console.log(`[fix-typography] ${write ? "wrote" : "would write"} ${changes.length} files`);
