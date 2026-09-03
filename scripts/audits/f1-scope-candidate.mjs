#!/usr/bin/env node
/**
 * f1-scope-candidate.mjs — Track A / F1 Scope Review (NO MUTATION).
 *
 * Reads the accepted F0 baseline (`f0-frontend-baseline.json`) and converts the
 * 95 ACTUAL_VIOLATION rows into a *candidate* execution scope, clustered by root
 * architectural cause. It does NOT modify any source file and does NOT freeze a
 * scope hash — the emitted `scopeHashPreview` is informational only.
 */
import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";

const ROOT = process.cwd();
const OUT_DIR = join(ROOT, "scripts/audits/output");
const BASELINE = join(OUT_DIR, "f0-frontend-baseline.json");

const baseline = JSON.parse(readFileSync(BASELINE, "utf8"));
const all = baseline.violations;
const actual = all.filter((v) => v.classification === "ACTUAL_VIOLATION");

// ---- existing approved application surface -------------------------------
const FACADE_DIR = join(ROOT, "src/application/queries");
const facadeByRepo = new Map();
for (const f of readdirSync(FACADE_DIR)) {
  if (!f.endsWith(".ts") || f === "index.ts") continue;
  const src = readFileSync(join(FACADE_DIR, f), "utf8");
  for (const m of src.matchAll(/from\s+"@\/lib\/repositories\/([^"]+)"/g)) {
    facadeByRepo.set(`lib/repositories/${m[1]}.ts`, `@/application/queries/${f.replace(/\.ts$/, "")}`);
  }
}

// ---- clustering by root architectural cause ------------------------------
const CLUSTERS = {
  "pages→repositories": {
    batch: "F1-A",
    phase: "F1",
    cause: "Presentation (page) binds directly to the repository layer; no approved application surface is used.",
    target: "Application Query Facade (`@/application/queries/*`)",
    mutation: "Exact import redirect only (module specifier swap). No call-site, signature, or behaviour change.",
    risk: "LOW — mechanical redirect over a pure re-export facade.",
  },
  "components→repositories": {
    batch: "F1-B",
    phase: "F1",
    cause: "Presentation (component) binds directly to the repository layer; no approved application surface is used.",
    target: "Application Query Facade (`@/application/queries/*`)",
    mutation: "Exact import redirect only (module specifier swap). No call-site, signature, or behaviour change.",
    risk: "LOW — mechanical redirect; MEDIUM where the import is the barrel `lib/repositories/index.ts` and symbols must be resolved per-symbol.",
  },
  "pages→supabase-client": {
    batch: "F2-C",
    phase: "F2",
    cause: "Presentation (page) performs data access against the database client directly; no repository exists for the accessed read/write path.",
    target: "New repository function (Repository layer) exposed through an Application facade; a Query Service ONLY where the read path is composed/orchestrated.",
    mutation: "Extract the inline data-access call into the data layer, then redirect the call site. Behaviour-equivalent extraction, not a rewrite.",
    risk: "MEDIUM/HIGH — real code movement; requires per-call-site behaviour proof.",
  },
  "components→supabase-client": {
    batch: "F2-D",
    phase: "F2",
    cause: "Presentation (component) performs data access against the database client directly; no repository exists for the accessed read/write path.",
    target: "New repository function (Repository layer) exposed through an Application facade; a Query Service ONLY where the read path is composed/orchestrated.",
    mutation: "Extract the inline data-access call into the data layer, then redirect the call site. Behaviour-equivalent extraction, not a rewrite.",
    risk: "MEDIUM/HIGH — real code movement; requires per-call-site behaviour proof.",
  },
};

const VERIFICATION =
  "node scripts/audits/verify-item-scope.mjs && node scripts/audits/typecheck-app.mjs && node scripts/fitness/run-all.mjs && npx vitest run && node scripts/audits/dep-graph.mjs";

const order = ["pages→repositories", "components→repositories", "pages→supabase-client", "components→supabase-client"];
const items = [];
let n = 0;
for (const rule of order) {
  const rows = actual
    .filter((v) => v.rule === rule)
    .sort((a, b) => (a.from + a.to).localeCompare(b.from + b.to));
  for (const row of rows) {
    const c = CLUSTERS[rule];
    n += 1;
    const existing = facadeByRepo.get(row.to);
    const barrel = row.to === "lib/repositories/index.ts";
    items.push({
      id: `F1-${String(n).padStart(3, "0")}`,
      batch: c.batch,
      phase: c.phase,
      file: `src/${row.from}`,
      currentEdge: `${row.rule}: src/${row.from} → src/${row.to}`,
      classification: "ACTUAL_VIOLATION",
      rootCause: c.cause,
      targetBoundary: c.target,
      approvedTargetSurface: rule.endsWith("repositories")
        ? existing ?? (barrel
            ? "PENDING RESOLUTION — barrel import; resolve per imported symbol to an existing facade, else propose one thin facade"
            : `NEW THIN FACADE REQUIRED — pure re-export of @/${row.to.replace(/\.ts$/, "")}`)
        : "PENDING DESIGN — repository function does not yet exist for this path",
      expectedMutation: c.mutation,
      behaviorPreservation:
        "Observable behaviour, rendered output, network calls, and financial figures identical pre/post change (PRINCIPLE 13).",
      verificationCommand: VERIFICATION,
      exitCondition: `The edge \`${row.rule}\` from src/${row.from} is absent from dep-graph output and no new layer edge is introduced.`,
      risk: c.risk,
      queryServiceDecision:
        rule.endsWith("repositories")
          ? "NO — an existing repository already covers this path; creating a Query Service would add a layer without cause."
          : "DEFERRED — decide per call site in F2: simple CRUD → repository only; composed/orchestrated read → Query Service.",
    });
  }
}

const byBatch = {};
for (const it of items) {
  byBatch[it.batch] ??= { batch: it.batch, phase: it.phase, count: 0, rootCause: CLUSTERS[order.find((r) => CLUSTERS[r].batch === it.batch)].cause };
  byBatch[it.batch].count += 1;
}

const payload = {
  schemaVersion: 1,
  unit: "F1-SCOPE-001",
  status: "CANDIDATE — NOT FROZEN, NOT AUTHORIZED",
  mode: "SCOPE REVIEW ONLY — no source mutation, no scope hash freeze",
  generatedAt: new Date().toISOString(),
  predecessor: { unit: "F0-NAZRA-001", state: "ACCEPTED (human review)" },
  classificationPreserved: {
    total: all.length,
    ACTUAL_VIOLATION: all.filter((v) => v.classification === "ACTUAL_VIOLATION").length,
    TRANSITIONAL: all.filter((v) => v.classification === "TRANSITIONAL").length,
    FALSE_POSITIVE: all.filter((v) => v.classification === "FALSE_POSITIVE").length,
    LEGITIMATE_EXCEPTION: all.filter((v) => v.classification === "LEGITIMATE_EXCEPTION").length,
    note: "155 is not a reduction target. Only ACTUAL_VIOLATION rows may enter F1/F2 scope.",
  },
  batches: Object.values(byBatch),
  items,
};
payload.scopeHashPreview = createHash("sha256")
  .update(JSON.stringify(items.map((i) => [i.id, i.file, i.currentEdge])))
  .digest("hex");
payload.scopeHashPreviewNote = "INFORMATIONAL ONLY — the scope hash is NOT frozen and carries no authorization.";

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(join(OUT_DIR, "f1-scope-candidate.json"), JSON.stringify(payload, null, 2) + "\n");

// ---- markdown ------------------------------------------------------------
const L = [];
L.push("# F1_SCOPE_001 — CANDIDATE EXECUTION SCOPE (NOT FROZEN, NOT AUTHORIZED)");
L.push("");
L.push("> Generated by `scripts/audits/f1-scope-candidate.mjs` from the accepted F0 baseline.");
L.push("> **No source was modified. No scope hash is frozen. F1 execution is not authorized.**");
L.push("");
L.push("- **Predecessor:** `F0-NAZRA-001` — ACCEPTED as baseline by human review.");
L.push("- **Evidence:** `scripts/audits/output/f0-frontend-baseline.json`, `scripts/audits/output/f1-scope-candidate.json`");
L.push("- **Governing rule:** only `ACTUAL_VIOLATION` rows may enter F1/F2 scope. The full 155-row classification and its rationale remain intact in `F0_APPENDIX_A_VIOLATION_CLASSIFICATION.md`.");
L.push("");
L.push("## 1. Classification carried forward (unchanged)");
L.push("");
L.push("| Classification | Count | Eligible for F1/F2 |");
L.push("|---|---:|---|");
L.push(`| ACTUAL_VIOLATION | ${payload.classificationPreserved.ACTUAL_VIOLATION} | YES |`);
L.push(`| TRANSITIONAL | ${payload.classificationPreserved.TRANSITIONAL} | NO — resolved by contract extraction (separate item) |`);
L.push(`| FALSE_POSITIVE | ${payload.classificationPreserved.FALSE_POSITIVE} | NO — rule/tooling accuracy |`);
L.push(`| LEGITIMATE_EXCEPTION | ${payload.classificationPreserved.LEGITIMATE_EXCEPTION} | NO — exception register |`);
L.push(`| **Total** | **${payload.classificationPreserved.total}** | 155 is **not** a reduction target |`);
L.push("");
L.push("## 2. The 95 actual violations clustered by root architectural cause");
L.push("");
L.push("| Batch | Phase | Root architectural cause | Items |");
L.push("|---|---|---|---:|");
for (const b of Object.values(byBatch)) L.push(`| ${b.batch} | ${b.phase} | ${b.rootCause} | ${b.count} |`);
L.push("");
L.push("**F1 = removal of wrong edges over already-approved surfaces.** **F2 = completion of the application/data-access architecture** where no data-layer function exists yet. Batches F2-C and F2-D are listed here for traceability only; they are explicitly *not* F1 work.");
L.push("");
L.push("### Query-Service restraint rule (binding on F1 and F2)");
L.push("");
L.push("> If a path is simple CRUD with a clear existing repository, **no additional abstraction is created**. A Query Service is introduced **only** when the read path is composed, orchestrated, projected, or carries application policy. Layer count is never increased for symmetry.");
L.push("");
L.push("## 3. Candidate items");
for (const b of Object.values(byBatch)) {
  L.push("");
  L.push(`### Batch ${b.batch} (${b.phase}) — ${b.count} items`);
  L.push("");
  L.push("| ID | File | Current edge | Approved target surface | Expected mutation | Risk |");
  L.push("|---|---|---|---|---|---|");
  for (const it of items.filter((i) => i.batch === b.batch)) {
    L.push(`| ${it.id} | \`${it.file}\` | ${it.currentEdge.split(": ")[0]} → \`${it.currentEdge.split("→ ")[1]}\` | ${it.approvedTargetSurface} | ${it.expectedMutation.split(".")[0]} | ${it.risk.split(" —")[0]} |`);
  }
}
L.push("");
L.push("Full per-item records (all 12 required fields, including behaviour-preservation constraint, verification command, exit condition, and the Query-Service decision) are in `scripts/audits/output/f1-scope-candidate.json`.");
L.push("");
L.push("## 4. Uniform verification command (per item)");
L.push("");
L.push("```bash");
L.push(VERIFICATION);
L.push("```");
L.push("");
L.push("## 5. Uniform exit condition");
L.push("");
L.push("1. The declared edge no longer appears in `dep-graph` output.");
L.push("2. No new layer edge is introduced anywhere.");
L.push("3. Typecheck 0, fitness failures 0, Vitest at or above the F0 figure (1619 passing).");
L.push("4. Observable behaviour, document totals, and journal balances unchanged.");
L.push("5. Any classification change appears as a documented delta, never a silent edit.");
L.push("");
L.push("## 6. Explicitly out of this scope");
L.push("");
L.push("- Any UI redesign, design-system remediation (635 findings), accessibility (222 findings), performance, RTL, state, or mobile/PWA work — these belong to F3…F6.");
L.push("- The 44 TRANSITIONAL rows (`lib/repositories/_base.ts` contract extraction) — separate item, separate approval.");
L.push("- PRE-EXT-001, RISK-007, RISK-008 — remain OPEN. PRE-TS-001 remains CONTAINED. Smart Freeze remains ACTIVE.");
L.push("- Freezing a scope hash. `scopeHashPreview` in the JSON is informational only.");
L.push("");
L.push("## 7. Required gate before F1 execution");
L.push("");
L.push("```text");
L.push("F0 ACCEPTED → F1 Scope Review (this document) → Human approval");
L.push("           → F1-SCOPE-HASH frozen → F1 batch F1-A only → evidence → review");
L.push("```");
L.push("");
L.push("Nothing in this document constitutes authorization.");
L.push("");

writeFileSync(join(ROOT, "docs/governance/F1_SCOPE_001_DRAFT.md"), L.join("\n"));
console.log(`[f1-scope-candidate] items=${items.length} batches=${Object.keys(byBatch).length} preview=${payload.scopeHashPreview.slice(0, 8)}`);
if (!existsSync(BASELINE)) process.exit(1);
