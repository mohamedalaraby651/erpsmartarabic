#!/usr/bin/env node
/**
 * Score Canonical Components — UX-1C.
 *
 * For every primitive in `src/ui/primitives/**`, derives a multi-dimensional
 * score per the rubric defined in `docs/architecture/CANONICAL_COMPONENT_CRITERIA.md`.
 *
 * Dimensions are computed from observable signals (file metadata + sibling
 * tests + fitness reports) so the score is deterministic and reproducible.
 *
 * A primitive is eligible for `Canonical` promotion only if:
 *   total >= 90  AND  every dimension >= its pass threshold.
 */
import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync, statSync } from "node:fs";
import { dirname, relative, resolve, sep, basename } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../..");
const PRIMS = resolve(ROOT, "src/ui/primitives");
const FITNESS_DIR = resolve(ROOT, "scripts/audits/output/fitness");
const OUT = resolve(ROOT, "scripts/audits/output/canonical-score.json");

const RUBRIC = [
  { key: "a11y", weight: 20, pass: 16 },
  { key: "api", weight: 15, pass: 12 },
  { key: "tests", weight: 15, pass: 11 },
  { key: "bundle", weight: 10, pass: 7 },
  { key: "rtl", weight: 10, pass: 8 },
  { key: "tokens", weight: 10, pass: 8 },
  { key: "keyboard", weight: 10, pass: 8 },
  { key: "docs", weight: 10, pass: 7 },
];

function listPrimitives() {
  return readdirSync(PRIMS, { withFileTypes: true })
    .filter((e) => e.isFile() && /\.(ts|tsx)$/.test(e.name))
    .filter((e) => !["index.ts", "types.ts"].includes(e.name))
    .map((e) => resolve(PRIMS, e.name))
    .sort((a, b) => a.localeCompare(b));
}

function readJsonSafe(p) {
  try { return JSON.parse(readFileSync(p, "utf8")); } catch { return null; }
}

const fitness = {
  isolation: readJsonSafe(resolve(FITNESS_DIR, "check-primitive-isolation.json")),
  lifecycle: readJsonSafe(resolve(FITNESS_DIR, "check-canonical-lifecycle-tags.json")),
  rtl: readJsonSafe(resolve(FITNESS_DIR, "check-rtl-logical-properties.json")),
};

function scoreOne(file) {
  const rel = relative(ROOT, file).split(sep).join("/");
  const name = basename(file).replace(/\.(ts|tsx)$/, "");
  const code = readFileSync(file, "utf8");
  const head = code.slice(0, 800);
  const size = statSync(file).size;

  // a11y — primitives that need aria/role/focus-visible
  const hasFocusVisible = /focus-visible:/.test(code);
  const hasAria = /aria-|role=|sr-only|visuallyHidden|Indicator/.test(code);
  const a11yScore =
    20 -
    (hasFocusVisible ? 0 : 4) -
    (hasAria ? 0 : 4);

  // api — forwardRef + displayName + named export
  const hasForwardRef = /forwardRef</.test(code) || /^export function\s/m.test(code);
  const hasDisplayName = /\.displayName\s*=/.test(code) || /^export function\s/m.test(code);
  const apiScore = 15 - (hasForwardRef ? 0 : 2) - (hasDisplayName ? 0 : 1);

  // tests — presence of consolidated test files covering this primitive
  const testFiles = [
    "src/ui/primitives/__tests__/primitives.smoke.test.tsx",
    "src/ui/primitives/__tests__/primitives.a11y.test.tsx",
    "src/ui/primitives/__tests__/primitives.rtl.test.tsx",
  ];
  let testsHits = 0;
  for (const t of testFiles) {
    const p = resolve(ROOT, t);
    if (existsSync(p) && readFileSync(p, "utf8").includes(name)) testsHits++;
  }
  const testsScore = Math.min(15, 6 + testsHits * 3);

  // bundle — heuristic: <8KB source → full; up to 20KB linear; >20KB caps at 5
  const kb = size / 1024;
  const bundleScore = kb <= 8 ? 10 : kb <= 20 ? Math.round(10 - (kb - 8) * 0.4) : 5;

  // rtl — passes if fitness PASS overall; primitive specifically clean
  const rtlClean = fitness.rtl?.pass === true || !(fitness.rtl?.violations ?? []).some((v) => v.file === rel);
  const rtlScore = rtlClean ? 10 : 5;

  // tokens — no hardcoded colors / px radii
  const hasHardcoded = /#[0-9a-fA-F]{3,6}\b|rgb\(|hsl\(\s*\d|\brounded-\[\d/.test(code);
  const tokensScore = hasHardcoded ? 6 : 10;

  // keyboard — Radix-based or explicit key handlers
  const kbd = /from\s+["']@radix-ui|onKeyDown|tabIndex|focus-visible:/.test(code);
  const keyboardScore = kbd ? 10 : 6;

  // docs — JSDoc header length + lifecycle tags
  const hasState = /@canonicalState/.test(head);
  const hasAdr = /@adr/.test(head);
  const hasSince = /@since/.test(head);
  const headerLines = head.split("\n").filter((l) => l.trim().startsWith("*")).length;
  const docsScore =
    (hasState ? 3 : 0) + (hasAdr ? 2 : 0) + (hasSince ? 2 : 0) + Math.min(3, Math.floor(headerLines / 4));

  const dims = {
    a11y: Math.max(0, a11yScore),
    api: Math.max(0, apiScore),
    tests: testsScore,
    bundle: bundleScore,
    rtl: rtlScore,
    tokens: tokensScore,
    keyboard: keyboardScore,
    docs: docsScore,
  };
  const total = Object.values(dims).reduce((a, b) => a + b, 0);
  const passed = RUBRIC.every((r) => dims[r.key] >= r.pass);
  const eligible = total >= 90 && passed;

  // Lifecycle stated in source
  const declaredState = head.match(/@canonicalState\s+(\S+)/)?.[1] ?? "Experimental";

  return {
    file: rel,
    name,
    sizeBytes: size,
    declaredState,
    dimensions: dims,
    total,
    eligibleForCanonical: eligible,
    promotion:
      eligible && declaredState === "Canonical"
        ? "verified"
        : eligible
          ? "ready-for-promotion"
          : "blocked",
  };
}

const results = listPrimitives().map(scoreOne);
const summary = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString().slice(0, 10),
  baselineVersion: "UX-1",
  rubric: RUBRIC,
  count: results.length,
  verified: results.filter((r) => r.promotion === "verified").length,
  readyForPromotion: results.filter((r) => r.promotion === "ready-for-promotion").length,
  blocked: results.filter((r) => r.promotion === "blocked").length,
  averageTotal:
    Math.round((results.reduce((a, b) => a + b.total, 0) / Math.max(1, results.length)) * 10) / 10,
  primitives: results,
};

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(summary, null, 2) + "\n");

console.log(
  `[score:canonical] primitives=${summary.count} verified=${summary.verified} ready=${summary.readyForPromotion} blocked=${summary.blocked} avg=${summary.averageTotal}`,
);
for (const r of results.filter((x) => x.promotion === "blocked")) {
  const failed = RUBRIC.filter((d) => r.dimensions[d.key] < d.pass)
    .map((d) => `${d.key}=${r.dimensions[d.key]}/${d.pass}`)
    .join(", ");
  console.log(`  BLOCKED ${r.name} total=${r.total} (${failed || "total<90"})`);
}
