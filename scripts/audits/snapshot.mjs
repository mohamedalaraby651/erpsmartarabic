#!/usr/bin/env node
// scripts/audits/snapshot.mjs
// UX-0: src/ tree (depth 3) + LOC per top folder + gap vs target layers.
import { mkdirSync, writeFileSync, readdirSync, statSync, readFileSync } from "node:fs";
import { dirname, resolve, relative } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../..");
const SRC = resolve(ROOT, "src");
const OUT = resolve(__dirname, "output/snapshot-report.json");

function walk(dir, depth, maxDepth) {
  const entries = readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name));
  const out = { dir: relative(ROOT, dir), files: 0, loc: 0, children: [] };
  for (const e of entries) {
    if (e.name === "node_modules") continue;
    const p = resolve(dir, e.name);
    if (e.isDirectory()) {
      const child = walk(p, depth + 1, maxDepth);
      out.files += child.files;
      out.loc += child.loc;
      if (depth < maxDepth) out.children.push(child);
    } else if (/\.(tsx?|jsx?|css)$/.test(e.name) && !e.name.endsWith(".d.ts")) {
      out.files++;
      try { out.loc += readFileSync(p, "utf8").split("\n").length; } catch {}
    }
  }
  out.children.sort((a, b) => a.dir.localeCompare(b.dir));
  return out;
}

const tree = walk(SRC, 0, 3);

const topFolders = readdirSync(SRC, { withFileTypes: true })
  .filter(e => e.isDirectory())
  .map(e => e.name)
  .sort();

const targetLayers = ["ui", "contracts", "workspaces", "workflows"];
const gap = targetLayers.filter(l => !topFolders.includes(l));

const report = {
  schemaVersion: 1,
  baselineVersion: "UX-0",
  topFolders,
  targetLayersGap: gap,
  totalFiles: tree.files,
  totalLoc: tree.loc,
  tree,
};

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(report, null, 2) + "\n");
console.log(`[snapshot] files=${tree.files} loc=${tree.loc} gap=${gap.join(",")} → ${OUT}`);
