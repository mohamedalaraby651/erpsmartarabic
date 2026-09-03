#!/usr/bin/env node
/**
 * f1-scope-001.mjs — Track A / F1 FROZEN SCOPE (NO SOURCE MUTATION).
 *
 * Human Review Decision (F1: ACCEPTED WITH CONSTRAINT):
 *   AUTHORIZED  : F1-A pages→repositories (4) + F1-B components→repositories (33) = 37 items
 *   NOT AUTHORIZED: F2-C pages→supabase-client (24) + F2-D components→supabase-client (34) = 58 items
 *
 * This script therefore emits TWO separate artefacts:
 *   - f1-scope-001.json        -> the 37 authorized items + frozen SHA-256 scope hash
 *   - f2-scope-candidate.json  -> the 58 candidate items, explicitly NOT AUTHORIZED, NOT hashed
 *
 * Constraint 6: if an approved target surface does not already exist for an item,
 * the item is emitted as BLOCKED (STOP) and MUST NOT be mutated during F1.
 * Constraint 7: no new Query Service may be created during F1 to satisfy a redirect.
 */
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";

const ROOT = process.cwd();
const OUT_DIR = join(ROOT, "scripts/audits/output");
const baseline = JSON.parse(readFileSync(join(OUT_DIR, "f0-frontend-baseline.json"), "utf8"));
const all = baseline.violations;
const actual = all.filter((v) => v.classification === "ACTUAL_VIOLATION");

// ---- existing approved application surface (must pre-exist; F1 creates none) ----
const FACADE_DIR = join(ROOT, "src/application/queries");
const facadeByRepo = new Map();
for (const f of readdirSync(FACADE_DIR)) {
  if (!f.endsWith(".ts") || f === "index.ts") continue;
  const src = readFileSync(join(FACADE_DIR, f), "utf8");
  for (const m of src.matchAll(/from\s+"@\/lib\/repositories\/([^"]+)"/g)) {
    facadeByRepo.set(`lib/repositories/${m[1]}.ts`, `@/application/queries/${f.replace(/\.ts$/, "")}`);
  }
}

const VERIFICATION =
  "node scripts/audits/verify-item-scope.mjs && node scripts/audits/typecheck-app.mjs && node scripts/fitness/run-all.mjs && npx vitest run && node scripts/audits/dep-graph.mjs";

const F1_RULES = {
  "pages→repositories": {
    batch: "F1-A",
    cause: "Presentation (page) binds directly to the repository layer instead of the approved application surface.",
  },
  "components→repositories": {
    batch: "F1-B",
    cause: "Presentation (component) binds directly to the repository layer instead of the approved application surface.",
  },
};
const F2_RULES = {
  "pages→supabase-client": {
    batch: "F2-C",
    cause: "Presentation (page) performs data access against the database client directly; no data-layer function exists for the path.",
  },
  "components→supabase-client": {
    batch: "F2-D",
    cause: "Presentation (component) performs data access against the database client directly; no data-layer function exists for the path.",
  },
};

function rowsFor(rule) {
  return actual
    .filter((v) => v.rule === rule)
    .sort((a, b) => (a.from + a.to).localeCompare(b.from + b.to));
}

// ---------------- F1 (AUTHORIZED, FROZEN) ----------------
const f1Items = [];
let n = 0;
for (const rule of ["pages→repositories", "components→repositories"]) {
  for (const row of rowsFor(rule)) {
    const c = F1_RULES[rule];
    n += 1;
    const barrel = row.to === "lib/repositories/index.ts";
    const existing = facadeByRepo.get(row.to);
    const state = existing ? "READY" : "BLOCKED";
    f1Items.push({
      id: `F1-${String(n).padStart(3, "0")}`,
      batch: c.batch,
      phase: "F1",
      state,
      file: `src/${row.from}`,
      currentEdge: `${rule}: src/${row.from} → src/${row.to}`,
      importedModule: `@/${row.to.replace(/\.ts$/, "")}`,
      classification: "ACTUAL_VIOLATION",
      rootCause: c.cause,
      approvedTargetSurface: existing ?? null,
      targetSurfaceExists: Boolean(existing),
      stopReason: existing
        ? null
        : barrel
          ? "STOP (Constraint 6) — repository barrel import; no single approved facade covers this edge. Requires a separate architectural decision, not an F1 redirect."
          : "STOP (Constraint 6) — no approved application facade exists for this repository. F1 may not invent one.",
      expectedMutation: existing
        ? "Exact import-specifier redirect only. No call-site, signature, argument, ordering, or behaviour change."
        : "NONE — item is blocked and excluded from the F1 mutation window.",
      behaviorPreservation:
        "Observable behaviour, rendered output, network calls and financial figures identical pre/post change.",
      verificationCommand: VERIFICATION,
      exitCondition: `Edge \`${rule}\` from src/${row.from} to src/${row.to} absent from dep-graph output; no new forbidden edge introduced.`,
      queryServiceDecision:
        "NO — Constraint 7: no Query Service may be created during F1 to satisfy a redirect.",
      trackSeparation:
        "Track A only. File is outside src/domain/**, src/application/finance/**, migrations, RLS and BND-05 security surface (Constraint 4).",
    });
  }
}

const trackBViolation = f1Items.filter((i) =>
  /^src\/(domain|application\/finance)\//.test(i.file),
);

const f1Ready = f1Items.filter((i) => i.state === "READY");
const f1Blocked = f1Items.filter((i) => i.state === "BLOCKED");

const scopeHash = createHash("sha256")
  .update(
    JSON.stringify(
      f1Items.map((i) => [i.id, i.batch, i.file, i.currentEdge, i.state, i.approvedTargetSurface]),
    ),
  )
  .digest("hex");

const f1 = {
  schemaVersion: 1,
  unit: "F1-SCOPE-001",
  status: "FROZEN — AUTHORIZED SCOPE (37 items)",
  mode: "SCOPE DEFINITION ONLY — this script performs no source mutation",
  generatedAt: new Date().toISOString(),
  predecessor: { unit: "F0-NAZRA-001", state: "ACCEPTED (human review)" },
  humanDecision: "F1 Scope Review — ACCEPTED WITH CONSTRAINT (Constraints 1–5)",
  authorizedBatches: { "F1-A": rowsFor("pages→repositories").length, "F1-B": rowsFor("components→repositories").length },
  authorizedItemCount: f1Items.length,
  readyItemCount: f1Ready.length,
  blockedItemCount: f1Blocked.length,
  notAuthorized: {
    unit: "F2-SCOPE-CANDIDATE",
    "F2-C": rowsFor("pages→supabase-client").length,
    "F2-D": rowsFor("components→supabase-client").length,
    note: "The 58 F2 items are candidate scope only and carry NO authorization and NO scope hash.",
  },
  classificationPreserved: {
    total: all.length,
    ACTUAL_VIOLATION: actual.length,
    TRANSITIONAL: all.filter((v) => v.classification === "TRANSITIONAL").length,
    FALSE_POSITIVE: all.filter((v) => v.classification === "FALSE_POSITIVE").length,
    LEGITIMATE_EXCEPTION: all.filter((v) => v.classification === "LEGITIMATE_EXCEPTION").length,
    note: "155 is not a reduction target. Only ACTUAL_VIOLATION rows may enter scope.",
  },
  constraints: [
    "C1 — Frozen scope covers the 37 F1-A/F1-B items only; the 95-row set is NOT frozen.",
    "C2 — No refactoring: current edge → existing approved surface. No repository/hook/service redesign.",
    "C3 — Behaviour preservation is mandatory and proven per item.",
    "C4 — No contact with BND-05: domain, finance application, RLS, migrations, security functions are out of scope.",
    "C5 — The 58 F2 items remain explicit, tracked, and unauthorized.",
    "C6 — Missing approved target surface ⇒ STOP that item.",
    "C7 — No new Query Services during F1.",
  ],
  trackSeparationCheck: {
    trackBFilesInScope: trackBViolation.length,
    result: trackBViolation.length === 0 ? "PASS" : "STOP",
  },
  allItemsAreActualViolations: f1Items.every((i) => i.classification === "ACTUAL_VIOLATION"),
  scopeHash,
  scopeHashAlgorithm: "sha256 over [id, batch, file, currentEdge, state, approvedTargetSurface] of all 37 items",
  items: f1Items,
};

// ---------------- F2 (CANDIDATE, NOT AUTHORIZED) ----------------
const f2Items = [];
let m = 0;
for (const rule of ["pages→supabase-client", "components→supabase-client"]) {
  for (const row of rowsFor(rule)) {
    const c = F2_RULES[rule];
    m += 1;
    f2Items.push({
      id: `F2-${String(m).padStart(3, "0")}`,
      batch: c.batch,
      phase: "F2",
      state: "CANDIDATE — NOT AUTHORIZED",
      file: `src/${row.from}`,
      currentEdge: `${rule}: src/${row.from} → src/${row.to}`,
      classification: "ACTUAL_VIOLATION",
      rootCause: c.cause,
      targetSurface: "UNDECIDED — requires a separate architectural decision in F2",
      queryServiceDecision:
        "DEFERRED — simple CRUD → repository only; composed/orchestrated read → Query Service. Never for symmetry.",
    });
  }
}

const f2 = {
  schemaVersion: 1,
  unit: "F2-SCOPE-CANDIDATE",
  status: "CANDIDATE ONLY — NOT AUTHORIZED, NOT FROZEN, NO SCOPE HASH",
  generatedAt: f1.generatedAt,
  parent: "F0-NAZRA-001 classification (95 ACTUAL_VIOLATION rows)",
  itemCount: f2Items.length,
  batches: { "F2-C": rowsFor("pages→supabase-client").length, "F2-D": rowsFor("components→supabase-client").length },
  note: "Listed so the 58 infrastructure leaks remain visible and tracked. Mutation is prohibited until F2 is separately authorized and hashed.",
  items: f2Items,
};

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(join(OUT_DIR, "f1-scope-001.json"), JSON.stringify(f1, null, 2) + "\n");
writeFileSync(join(OUT_DIR, "f2-scope-candidate.json"), JSON.stringify(f2, null, 2) + "\n");

// ---------------- markdown: F1 ----------------
const L = [];
L.push("# F1_SCOPE_001 — FROZEN AUTHORIZED SCOPE (37 items)");
L.push("");
L.push("> Generated by `scripts/audits/f1-scope-001.mjs`. **No source file was modified by scope generation.**");
L.push("> Human decision: **F1 Scope Review — ACCEPTED WITH CONSTRAINT**.");
L.push("");
L.push(`- **Scope hash (SHA-256, FROZEN):** \`${scopeHash}\``);
L.push("- **Hash input:** `[id, batch, file, currentEdge, state, approvedTargetSurface]` over exactly the 37 F1-A/F1-B items.");
L.push("- **Predecessor:** `F0-NAZRA-001` — ACCEPTED.");
L.push("- **Evidence:** `scripts/audits/output/f1-scope-001.json`");
L.push("- **Explicitly excluded:** the 58 F2-C/F2-D items — see `F2_SCOPE_CANDIDATE.md` (**NOT AUTHORIZED**).");
L.push("");
L.push("## 1. Authorized scope");
L.push("");
L.push("| Batch | Rule | Items | Authorization |");
L.push("|---|---|---:|---|");
L.push(`| F1-A | pages→repositories | ${f1.authorizedBatches["F1-A"]} | AUTHORIZED |`);
L.push(`| F1-B | components→repositories | ${f1.authorizedBatches["F1-B"]} | AUTHORIZED |`);
L.push(`| **F1 total** | | **${f1Items.length}** | **FROZEN** |`);
L.push(`| F2-C | pages→supabase-client | ${f2.batches["F2-C"]} | NOT AUTHORIZED |`);
L.push(`| F2-D | components→supabase-client | ${f2.batches["F2-D"]} | NOT AUTHORIZED |`);
L.push(`| F2 total | | ${f2Items.length} | CANDIDATE ONLY |`);
L.push("");
L.push("## 2. Pre-mutation gate results");
L.push("");
L.push("| Gate | Result |");
L.push("|---|---|");
L.push(`| Every item classified ACTUAL_VIOLATION | ${f1.allItemsAreActualViolations ? "PASS" : "STOP"} |`);
L.push(`| Track A / Track B intersection (domain, finance app, RLS, migrations) | ${f1.trackSeparationCheck.result} (${trackBViolation.length} files) |`);
L.push(`| Approved target surface already exists | ${f1Ready.length}/${f1Items.length} READY — ${f1Blocked.length} BLOCKED (STOP per Constraint 6) |`);
L.push(`| New Query Services required by F1 | 0 (Constraint 7) |`);
L.push("");
L.push(`**Executable F1 mutation window = ${f1Ready.length} items.** The remaining ${f1Blocked.length} items are frozen in scope but carry state \`BLOCKED\`: their approved target surface does not exist, and F1 is forbidden from inventing one. They are reported as findings, not silently dropped, and require a separate human decision.`);
L.push("");
L.push("## 3. Binding constraints");
L.push("");
for (const c of f1.constraints) L.push(`- ${c}`);
L.push("");
L.push("## 4. Items — READY (executable)");
L.push("");
L.push("| ID | Batch | File | Current edge target | Approved target surface |");
L.push("|---|---|---|---|---|");
for (const i of f1Ready) L.push(`| ${i.id} | ${i.batch} | \`${i.file}\` | \`${i.importedModule}\` | \`${i.approvedTargetSurface}\` |`);
L.push("");
L.push("## 5. Items — BLOCKED (STOP, no mutation)");
L.push("");
L.push("| ID | Batch | File | Current edge target | STOP reason |");
L.push("|---|---|---|---|---|");
for (const i of f1Blocked) L.push(`| ${i.id} | ${i.batch} | \`${i.file}\` | \`${i.importedModule}\` | ${i.stopReason} |`);
L.push("");
L.push("## 6. Per-item execution contract (applies to every READY item)");
L.push("");
L.push("1. Pre-mutation item-scope verification (`scripts/audits/verify-item-scope.mjs`).");
L.push("2. Exact import-specifier redirect only — no other line in the file may change.");
L.push("3. Post-mutation verification: typecheck, fitness, Vitest, dep-graph.");
L.push("4. Exit condition: the forbidden edge is absent and no new forbidden edge appears.");
L.push("5. Any behavioural difference is recorded as a finding and the item is reverted — never adjusted outside scope.");
L.push("");
L.push("## 7. Status");
L.push("");
L.push("| Item | State |");
L.push("|---|---|");
L.push("| BND-05 | CERTIFIED (1/8) |");
L.push("| F0 | ACCEPTED |");
L.push("| F1 scope | FROZEN — 37 items |");
L.push("| F1 execution | AUTHORIZED, awaiting execution order |");
L.push("| F2 | NOT AUTHORIZED |");
L.push("| F3–F6 | LOCKED |");
L.push("| RISK-007 / RISK-008 / PRE-EXT-001 | OPEN |");
L.push("| PRE-TS-001 | CONTAINED |");
L.push("| Smart Freeze | ACTIVE |");
L.push("");
writeFileSync(join(ROOT, "docs/governance/F1_SCOPE_001.md"), L.join("\n"));

// ---------------- markdown: F2 ----------------
const M = [];
M.push("# F2_SCOPE_CANDIDATE — NOT AUTHORIZED");
M.push("");
M.push("> Candidate scope only. **No authorization. No frozen scope hash. Mutation prohibited.**");
M.push("> Generated by `scripts/audits/f1-scope-001.mjs`; evidence: `scripts/audits/output/f2-scope-candidate.json`.");
M.push("");
M.push(`- **Items:** ${f2Items.length} (F2-C pages→supabase-client = ${f2.batches["F2-C"]}, F2-D components→supabase-client = ${f2.batches["F2-D"]})`);
M.push("- **Reason for separation:** F1 removes wrong architectural edges over surfaces that already exist. F2 must first *decide and build* the correct Application/Data-Access surface. Freezing both under one hash would merge two different execution phases.");
M.push("");
M.push("## Required F2 decision sequence (before any authorization)");
M.push("");
M.push("1. Determine the correct Application/Query surface per call site.");
M.push("2. Implement only necessary abstractions — simple CRUD gets a repository function, never a Query Service for symmetry.");
M.push("3. Produce a separate F2 scope document and its own SHA-256 hash.");
M.push("4. Human review, then authorization.");
M.push("");
M.push("## Items");
M.push("");
M.push("| ID | Batch | File |");
M.push("|---|---|---|");
for (const i of f2Items) M.push(`| ${i.id} | ${i.batch} | \`${i.file}\` |`);
M.push("");
writeFileSync(join(ROOT, "docs/governance/F2_SCOPE_CANDIDATE.md"), M.join("\n"));

console.log(`[F1] frozen items=${f1Items.length} ready=${f1Ready.length} blocked=${f1Blocked.length}`);
console.log(`[F1] scopeHash=${scopeHash}`);
console.log(`[F2] candidate items=${f2Items.length} (NOT AUTHORIZED)`);
