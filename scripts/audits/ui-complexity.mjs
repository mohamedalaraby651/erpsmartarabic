#!/usr/bin/env node
/**
 * ui-complexity.mjs — Wave 2 discovery.
 * Reports largest components, top importers, and hook-heavy pages.
 * Informational only.
 */
import { readdirSync, readFileSync, statSync, mkdirSync, writeFileSync } from "node:fs";
import { join, extname, relative } from "node:path";

const ROOT = process.cwd();
const SRC = join(ROOT, "src");
const OUT = join(ROOT, "scripts/audits/output/wave2-discovery");
const EXTS = new Set([".ts", ".tsx"]);

function walk(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    if (name.startsWith(".")) continue;
    const full = join(dir, name);
    const s = statSync(full);
    if (s.isDirectory()) walk(full, acc);
    else if (EXTS.has(extname(name))) acc.push(full);
  }
  return acc;
}

const entries = [];
for (const abs of walk(SRC)) {
  const src = readFileSync(abs, "utf8");
  const lines = src.split("\n").length;
  const importCount = (src.match(/^import\s/gm) || []).length;
  const hookUses = (src.match(/\buse[A-Z]\w+\s*\(/g) || []).length;
  entries.push({ file: relative(ROOT, abs).replace(/\\/g, "/"), lines, importCount, hookUses });
}

const largest = [...entries].sort((a, b) => b.lines - a.lines).slice(0, 25);
const topImporters = [...entries].sort((a, b) => b.importCount - a.importCount).slice(0, 25);
const hookHeavy = [...entries].filter((e) => e.file.startsWith("src/pages/") || e.file.includes("/pages/")).sort((a, b) => b.hookUses - a.hookUses).slice(0, 25);

mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, "ui-complexity.json"), JSON.stringify({ generatedAt: new Date().toISOString(), largest, topImporters, hookHeavy }, null, 2));
console.log(`[ui-complexity] largest=${largest[0]?.file}(${largest[0]?.lines}), hook-heavy pages=${hookHeavy.length}`);
