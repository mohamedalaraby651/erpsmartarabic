#!/usr/bin/env node
/**
 * UX-2B Wave 1.5 — Application public-surface Manifest snapshot.
 *
 * Why a Manifest (not Object.keys → sha256)?
 *   Hashing the raw export list is fragile: reordering, comment moves,
 *   or formatting changes flip the hash even when the *logical* surface
 *   is identical. A Manifest models the surface as a sorted, classified
 *   data structure and hashes the canonical JSON of THAT.
 *
 * Classification is RULE-BASED (heuristic), not a closed enumeration:
 *   - *Command          → commands
 *   - *Input            → commandInputs
 *   - *Result           → results
 *   - *HandlerDeps      → handlerDeps          (checked before *Handler)
 *   - *Handler          → handlers
 *   - *ApplicationError → errors
 *   - ALL_CAPS_UNDERSCORE values → errorFactories
 *   - everything else   → other                (does NOT auto-fail; see below)
 *
 * "Other" gate (UX-2B Wave 1.5 refinement #2):
 *   - empty                                    → PASS
 *   - non-empty + no prior manifest            → WARN, write baseline
 *   - non-empty + identical to prior baseline  → WARN (known acceptable)
 *   - non-empty + NEW symbols vs baseline      → FAIL (explicit review
 *                                                 required: either add a
 *                                                 classification rule or
 *                                                 update the baseline)
 *
 * Hash inputs (refinement #1):
 *   schemaVersion, generatorVersion, module, groups (sorted).
 * Excluded from hash:
 *   generatedAt.
 */
import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  existsSync,
} from "node:fs";
import { createHash } from "node:crypto";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../..");
const ENTRY = resolve(ROOT, "src/application/finance/index.ts");
const OUT_DIR = resolve(ROOT, "scripts/audits/output");
const OUT_MANIFEST = resolve(OUT_DIR, "ux2b-wave1_5-surface.manifest.json");
const OUT_HASH = resolve(OUT_DIR, "ux2b-wave1_5-surface.manifest.sha256");

const SCHEMA_VERSION = 1;
const GENERATOR_VERSION = 1;
const MODULE = "@/application/finance";

// ── Heuristic classifier ────────────────────────────────────────────────
const ALL_CAPS = /^[A-Z][A-Z0-9_]*$/;

function classify(symbol) {
  if (symbol.endsWith("HandlerDeps")) return "handlerDeps";
  if (symbol.endsWith("Handler")) return "handlers";
  if (symbol.endsWith("Command")) return "commands";
  if (symbol.endsWith("Input")) return "commandInputs";
  if (symbol.endsWith("Result")) return "results";
  if (symbol.endsWith("ApplicationError")) return "errors";
  if (ALL_CAPS.test(symbol)) return "errorFactories";
  return "other";
}

// ── Parse exports from the barrel ───────────────────────────────────────
const src = readFileSync(ENTRY, "utf8");
const symbols = new Set();
const exportRe = /export\s+(?:type\s+)?\{([\s\S]*?)\}\s+from/g;
let m;
while ((m = exportRe.exec(src)) !== null) {
  for (const part of m[1].split(",")) {
    const name = part.trim().replace(/\s+as\s+(\w+)$/, "$1");
    if (name) symbols.add(name);
  }
}
// `export * from "./invoice"` → recurse one level via the invoice barrel
if (/export\s+\*\s+from\s+["']\.\/invoice["']/.test(src)) {
  const invoiceBarrel = resolve(ROOT, "src/application/finance/invoice/index.ts");
  const inv = readFileSync(invoiceBarrel, "utf8");
  let im;
  const re = /export\s+(?:type\s+)?\{([\s\S]*?)\}\s+from/g;
  while ((im = re.exec(inv)) !== null) {
    for (const part of im[1].split(",")) {
      const name = part.trim().replace(/\s+as\s+(\w+)$/, "$1");
      if (name) symbols.add(name);
    }
  }
}

// ── Build classified, sorted groups ─────────────────────────────────────
const groups = {
  commands: [],
  commandInputs: [],
  results: [],
  handlers: [],
  handlerDeps: [],
  errors: [],
  errorFactories: [],
  other: [],
};
for (const s of [...symbols].sort()) {
  groups[classify(s)].push(s);
}

const manifest = {
  schemaVersion: SCHEMA_VERSION,
  generatorVersion: GENERATOR_VERSION,
  module: MODULE,
  generatedAt: new Date().toISOString(),
  groups,
};

// Canonical hash input: everything EXCEPT generatedAt.
const hashInput = {
  schemaVersion: SCHEMA_VERSION,
  generatorVersion: GENERATOR_VERSION,
  module: MODULE,
  groups,
};
const canonical = JSON.stringify(hashInput, Object.keys(hashInput).sort());
const hash = createHash("sha256").update(canonical).digest("hex");
manifest.contentHash = hash;

mkdirSync(OUT_DIR, { recursive: true });

// ── "Other" gate ────────────────────────────────────────────────────────
let exitCode = 0;
let bannerSuffix = "";
const previous = existsSync(OUT_MANIFEST)
  ? JSON.parse(readFileSync(OUT_MANIFEST, "utf8"))
  : null;
const prevOther = previous?.groups?.other ?? null;

if (groups.other.length > 0) {
  const isNewSet =
    prevOther === null ||
    groups.other.some((s) => !prevOther.includes(s));
  if (isNewSet && previous !== null) {
    exitCode = 1;
    bannerSuffix =
      ` FAIL: new unclassified symbols in "other": [${groups.other.join(", ")}].\n` +
      `       Either add a classification rule in snapshot-application-surface.mjs\n` +
      `       or update the baseline manifest deliberately.`;
  } else {
    bannerSuffix = ` WARN: ${groups.other.length} symbol(s) in "other": [${groups.other.join(", ")}]`;
  }
}

writeFileSync(OUT_MANIFEST, JSON.stringify(manifest, null, 2) + "\n");
writeFileSync(OUT_HASH, hash + "\n");

const totals = Object.entries(groups)
  .map(([k, v]) => `${k}=${v.length}`)
  .join(" ");
console.log(
  `[surface:application] ${exitCode === 0 ? "PASS" : "FAIL"} — module=${MODULE} hash=${hash.slice(0, 12)}… totals: ${totals}`,
);
if (bannerSuffix) console.log("[surface:application]" + bannerSuffix);
process.exit(exitCode);
