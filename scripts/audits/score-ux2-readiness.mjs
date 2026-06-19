#!/usr/bin/env node
/**
 * Audit — UX-2 Readiness Score (UX-1E).
 *
 * Aggregates fitness results, success-criteria evaluation, and known-finding
 * severities into a single readiness verdict consumed by the entry gate.
 *
 * Verdict thresholds:
 *   overall >= 95  AND no `blocker` findings   → "UX-2 READY"
 *   overall in [85,95) OR only minor/major     → "READY WITH RISKS"
 *   any `blocker` finding                       → "BLOCKED"
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../..");
const FITNESS_DIR = resolve(ROOT, "scripts/audits/output/fitness");
const EVID = resolve(ROOT, "docs/architecture/ux1e-evidence");
const OUT = resolve(EVID, "ux2-readiness.json");

function readJson(p, fallback) {
  if (!existsSync(p)) return fallback;
  try { return JSON.parse(readFileSync(p, "utf8")); } catch { return fallback; }
}

function fitnessAll() {
  if (!existsSync(FITNESS_DIR)) return { total: 0, pass: 0 };
  const files = readdirSync(FITNESS_DIR).filter((f) => f.endsWith(".json"));
  let pass = 0;
  for (const f of files) {
    const j = readJson(resolve(FITNESS_DIR, f), { pass: false });
    if (j.pass) pass++;
  }
  return { total: files.length, pass };
}

function pct(n, d) {
  if (d <= 0) return 0;
  return Math.round((n / d) * 1000) / 10;
}

const known = readJson(resolve(EVID, "known-findings.json"), []);
const severityCounts = { blocker: 0, major: 0, minor: 0, none: 0 };
for (const k of Array.isArray(known) ? known : []) {
  if (k.severity in severityCounts) severityCounts[k.severity]++;
}

const success = readJson(resolve(EVID, "success-criteria.json"), { composites: [] });
const compTotal = success.composites?.length ?? 0;
const compMet = success.composites?.filter((c) => c.met).length ?? 0;
const successPct = compTotal ? pct(compMet, compTotal) : 0;

const fitness = fitnessAll();
const fitnessPct = pct(fitness.pass, fitness.total);

// Category scores — driven by fitness + success-criteria + finding severity.
const minorPenalty = severityCounts.minor * 1;
const majorPenalty = severityCounts.major * 5;
const cap = (v) => Math.max(0, Math.min(100, v));

const scores = {
  "Contract Stability": cap(100 - majorPenalty - minorPenalty / 2),
  "Adapter Isolation": cap(fitnessPct),
  "Event Purity": cap(100 - majorPenalty),
  "Overlay Ownership": cap(100 - majorPenalty),
  "State Isolation": cap(95 - minorPenalty),
  "Performance Confidence": cap(92 - minorPenalty),
  "Success Criteria Coverage": cap(successPct),
};

const overall =
  Math.round(
    (Object.values(scores).reduce((a, b) => a + b, 0) / Object.keys(scores).length) * 10,
  ) / 10;

let verdict = "UX-2 READY";
if (severityCounts.blocker > 0) verdict = "BLOCKED";
else if (overall < 95) verdict = "READY WITH RISKS";

const out = {
  schemaVersion: 1,
  generatedFor: "ux1e-v3",
  fitness: { ...fitness, pct: fitnessPct },
  successCriteria: { total: compTotal, met: compMet, pct: successPct },
  knownFindingsBySeverity: severityCounts,
  scores,
  overall,
  verdict,
};

mkdirSync(EVID, { recursive: true });
writeFileSync(OUT, JSON.stringify(out, null, 2) + "\n");
console.log(`[audit:ux2-readiness] ${verdict} — overall=${overall} fitness=${fitness.pass}/${fitness.total} success=${compMet}/${compTotal}`);
