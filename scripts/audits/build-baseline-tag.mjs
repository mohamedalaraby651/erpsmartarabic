#!/usr/bin/env node
/**
 * Build a Baseline Architecture Tag (ADR-0013).
 *
 * Usage:
 *   node scripts/audits/build-baseline-tag.mjs <phase> <seq>
 *
 * Example:
 *   node scripts/audits/build-baseline-tag.mjs UX2B 001
 *
 * Output:
 *   scripts/audits/output/baseline-<phase-lower>-<seq>.json
 *
 * Composition (deterministic, sorted):
 *   - Every `Accepted` ADR under docs/adr/*.md
 *   - Every scripts/audits/output/*-lock.json
 *   - Every scripts/audits/output/*surface.manifest.json
 *   - PROJECT_MAP.md
 */
import { readFileSync, writeFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, join, resolve, relative } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..", "..");

const [, , phaseArg, seqArg] = process.argv;
if (!phaseArg || !seqArg) {
  console.error("Usage: build-baseline-tag.mjs <phase> <seq>");
  console.error("Example: build-baseline-tag.mjs UX2B 001");
  process.exit(2);
}
if (!/^[A-Z0-9-]+$/.test(phaseArg)) {
  console.error(`[baseline] invalid phase '${phaseArg}' (must match /^[A-Z0-9-]+$/)`);
  process.exit(2);
}
if (!/^\d{3}$/.test(seqArg)) {
  console.error(`[baseline] invalid seq '${seqArg}' (must be 3 digits)`);
  process.exit(2);
}
const tag = `BASELINE-${phaseArg}-${seqArg}`;

function sha256(buf) {
  return createHash("sha256").update(buf).digest("hex");
}
function fileSha(absPath) {
  return sha256(readFileSync(absPath));
}
function rel(p) {
  return relative(ROOT, p).split("\\").join("/");
}

// 1) Accepted ADRs
const adrDir = join(ROOT, "docs/adr");
const adrFiles = readdirSync(adrDir)
  .filter((f) => /^\d{4}-.*\.md$/.test(f))
  .map((f) => join(adrDir, f))
  .filter((abs) => {
    const src = readFileSync(abs, "utf8");
    return /^\s*[-*]?\s*\*\*Status:\*\*\s*Accepted/mi.test(src);
  });

// 2) Lock files
const outDir = join(ROOT, "scripts/audits/output");
const lockFiles = existsSync(outDir)
  ? readdirSync(outDir)
      .filter((f) => f.endsWith("-lock.json"))
      .map((f) => join(outDir, f))
  : [];

// 3) Surface manifests
const surfaceFiles = existsSync(outDir)
  ? readdirSync(outDir)
      .filter((f) => f.endsWith("surface.manifest.json"))
      .map((f) => join(outDir, f))
  : [];

// 4) PROJECT_MAP.md (any location — prefer root, fall back to docs/architecture)
const projectMapCandidates = [
  join(ROOT, "PROJECT_MAP.md"),
  join(ROOT, "docs/architecture/PROJECT_MAP.md"),
].filter((p) => existsSync(p) && statSync(p).isFile());

const entries = [...adrFiles, ...lockFiles, ...surfaceFiles, ...projectMapCandidates]
  .map((abs) => ({ path: rel(abs), sha256: fileSha(abs) }))
  .sort((a, b) => a.path.localeCompare(b.path));

const compositeInput = entries.map((e) => `${e.path}\t${e.sha256}`).join("\n");
const composite = sha256(Buffer.from(compositeInput, "utf8"));

const manifest = {
  schemaVersion: 1,
  tag,
  phase: phaseArg,
  seq: seqArg,
  builtAt: new Date().toISOString(),
  composite,
  entryCount: entries.length,
  entries,
};

const outFile = join(
  outDir,
  `baseline-${phaseArg.toLowerCase()}-${seqArg}.json`,
);
writeFileSync(outFile, JSON.stringify(manifest, null, 2) + "\n", "utf8");

console.log(`[baseline] ${tag} composite=${composite}`);
console.log(`[baseline] entries=${entries.length} -> ${rel(outFile)}`);
