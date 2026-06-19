#!/usr/bin/env node
/**
 * Audit — Adapter coverage matrix (UX-1E).
 *
 * Scans the harness + tests under `src/ui/__integration__/**` to detect
 * which scenarios each composite is exercised against. Writes
 * `docs/architecture/ux1e-evidence/adapter-coverage.json`.
 */
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../..");
const SCAN = resolve(ROOT, "src/ui/__integration__");
const MANIFEST = resolve(SCAN, "integration.manifest.ts");
const OUT = resolve(ROOT, "docs/architecture/ux1e-evidence/adapter-coverage.json");

function walk(dir, out = []) {
  let entries;
  try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of entries) {
    const p = resolve(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.(tsx?|mts|cts)$/.test(e.name)) out.push(p);
  }
  return out;
}

const manifestSrc = readFileSync(MANIFEST, "utf8");
const composites = [];
const scenarios = [];
const cb = manifestSrc.match(/composites:\s*\[(.*?)\]/s);
if (cb) for (const m of cb[1].matchAll(/"([^"]+)"/g)) composites.push(m[1]);
const sb = manifestSrc.match(/scenarios:\s*\[(.*?)\]/s);
if (sb) for (const m of sb[1].matchAll(/"([^"]+)"/g)) scenarios.push(m[1]);

const files = walk(SCAN);
const coverage = Object.fromEntries(composites.map((c) => [c, new Set()]));

for (const f of files) {
  const src = readFileSync(f, "utf8");
  const rel = f.split(ROOT + sep)[1]?.split(sep).join("/") ?? f;
  // Only count harness + tests as exercising surfaces.
  if (!rel.includes("/harness/") && !rel.includes("/__tests__/")) continue;
  const mentionedScenarios = scenarios.filter((s) => new RegExp(`["\']${s}["\']`).test(src));
  for (const c of composites) {
    if (new RegExp(`\\b${c}\\b`).test(src)) {
      for (const s of mentionedScenarios) coverage[c].add(s);
    }
  }
}

const out = {};
for (const c of composites) out[c] = Array.from(coverage[c]).sort();

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(out, null, 2) + "\n");
console.log(`[audit:adapter-coverage] OK — composites=${composites.length}`);
