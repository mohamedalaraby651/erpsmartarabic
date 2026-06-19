#!/usr/bin/env node
/**
 * Fitness — Composite event envelope (Invariant C10).
 *
 * Every `onEvent?.({ ... })` call inside `src/ui/composites/**` must carry
 * an object literal of shape `{ type: <string>, payload: { ... } }`. Raw
 * un-enveloped emissions are forbidden.
 */
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../..");
const OUT = resolve(__dirname, "../audits/output/fitness/check-composite-event-envelope.json");
const SCAN = resolve(ROOT, "src/ui/composites");

function walk(dir, out = []) {
  let entries;
  try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const p = resolve(dir, e.name);
    if (e.isDirectory()) {
      if (["__tests__", "__demo__"].includes(e.name)) continue;
      walk(p, out);
    } else if (/\.tsx?$/.test(e.name)) out.push(p);
  }
  return out;
}

// Match: onEvent?.({...}) / onEvent({...}) — capture the literal body.
const emitRe = /onEvent\??\.?\(\s*(\{[\s\S]*?\})\s*\)/g;

const files = walk(SCAN);
const violations = [];
let emissions = 0;

for (const f of files) {
  const rel = relative(ROOT, f).split(sep).join("/");
  const code = readFileSync(f, "utf8");
  let m;
  while ((m = emitRe.exec(code)) !== null) {
    emissions++;
    const lit = m[1];
    const hasType = /\btype\s*:\s*["'][a-z][\w.]*["']/.test(lit);
    const hasPayload = /\bpayload\s*:\s*\{/.test(lit);
    if (!hasType || !hasPayload) {
      violations.push({
        file: rel,
        why: `onEvent emission missing CompositeEvent envelope { type, payload }`,
      });
    }
  }
}
violations.sort((a, b) => a.file.localeCompare(b.file));

const report = {
  schemaVersion: 1,
  fitness: "check-composite-event-envelope",
  baselineVersion: "UX-1",
  scannedFiles: files.length,
  emissions,
  violations,
  pass: violations.length === 0,
};
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(report, null, 2) + "\n");
const status = report.pass ? "PASS" : "FAIL";
console.log(`[fitness:composite-event-envelope] ${status} — scanned=${files.length} emissions=${emissions} violations=${violations.length}`);
if (!report.pass) {
  for (const v of violations) console.log(`  ${v.file} — ${v.why}`);
  process.exit(1);
}
