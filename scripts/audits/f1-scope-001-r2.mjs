#!/usr/bin/env node
/**
 * F1_SCOPE_001-R2 — Scope revision generator (NO SOURCE MUTATION).
 *
 * Governance:
 *  - Predecessor: F1_SCOPE_001 (hash 2b4e37a0…).
 *  - The 37 item IDs, files, batches and currentEdge values are reproduced verbatim.
 *  - ONLY `state` and `approvedTargetSurface` may change.
 *  - Any deviation => F1-R2 SCOPE DRIFT REPORT, no source mutation.
 *
 * Reason for the revision: the human decision of 2026-09-03 authorizes a
 * minimal PURE RE-EXPORT facade when required to remediate an approved F1
 * edge. Constraint C6 of F1_SCOPE_001 ("missing target surface ⇒ STOP") is
 * therefore superseded for facade-resolvable items only.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const OUT_DIR = join(ROOT, "scripts/audits/output");
const PRED_FILE = join(OUT_DIR, "f1-scope-001.json");
const PRED_HASH = "2b4e37a030945bdbd922c8eb50a412e8fe1b95b512e4d3b86faf301d8ff652aa";

const pred = JSON.parse(readFileSync(PRED_FILE, "utf8"));

/** repository module (as imported) -> application query facade path. */
const FACADE_BY_REPO = {
  attendanceRepository: "@/application/queries/attendance",
  customerRepository: "@/application/queries/customers",
  customerSearchRepo: "@/application/queries/customer-search",
  expenseRepository: "@/application/queries/expenses",
  legacyQuotationsRepository: "@/application/queries/quotations",
  productRepository: "@/application/queries/products",
  purchaseOrderRepository: "@/application/queries/purchase-orders",
  referenceRepository: "@/application/queries/reference",
  salesOrderRepository: "@/application/queries/sales-orders",
  supplierRepository: "@/application/queries/suppliers",
  treasuryRepository: "@/application/queries/treasury",
  adminRepository: "@/application/queries/admin",
  // facades required by R2 (do not exist yet — created during F1-A/F1-B)
  activityLogsRepository: "@/application/queries/activity-logs",
  attachmentsRepository: "@/application/queries/attachments",
  creditNoteRepository: "@/application/queries/credit-notes",
  customerRelationsRepo: "@/application/queries/customer-relations",
  employeeRepository: "@/application/queries/employees",
  pdfAssetsRepository: "@/application/queries/pdf-assets",
  pdfProfilesRepository: "@/application/queries/pdf-profiles",
  priceListRepository: "@/application/queries/price-lists",
  reportTemplateRepository: "@/application/queries/report-templates",
  reportsRepository: "@/application/queries/reports",
  savedViewsRepository: "@/application/queries/saved-views",
  settingsRepository: "@/application/queries/settings",
  supplierPaymentRepository: "@/application/queries/supplier-payments",
  supplierRelationsRepo: "@/application/queries/supplier-relations",
  tasksRepository: "@/application/queries/tasks",
};

/**
 * Barrel consumers: symbols actually imported from `@/lib/repositories`,
 * read from source (read-only) and mapped to their owning repository module.
 */
const BARREL_SYMBOL_OWNER = {
  priceListRepository: "priceListRepository",
  PriceListRow: "priceListRepository",
  PriceListItemRow: "priceListRepository",
  legacyQuotationsRepository: "legacyQuotationsRepository",
  activityLogsRepository: "activityLogsRepository",
  tasksRepository: "tasksRepository",
  TaskRow: "tasksRepository",
  attendanceRepository: "attendanceRepository",
  customerRepository: "customerRepository",
  savedViewsRepository: "savedViewsRepository",
  reportsRepository: "reportsRepository",
  attachmentsRepository: "attachmentsRepository",
  supplierRepository: "supplierRepository",
};

const BARREL_RE = /import\s*(type\s*)?\{([^}]+)\}\s*from\s*["']@\/lib\/repositories["']/g;

function barrelSymbols(file) {
  const abs = join(ROOT, file);
  if (!existsSync(abs)) return null;
  const src = readFileSync(abs, "utf8");
  const out = [];
  for (const m of src.matchAll(BARREL_RE)) {
    for (const raw of m[2].split(",")) {
      const sym = raw.trim().replace(/^type\s+/, "").split(/\s+as\s+/)[0].trim();
      if (sym) out.push(sym);
    }
  }
  return out;
}

const drift = [];
const symbolResolution = {};
const facadesRequired = new Map(); // facade path -> { repo, items[] }

const items = pred.items.map((src) => {
  const item = { ...src };
  const isBarrel = src.importedModule === "@/lib/repositories/index";
  let targets = [];

  if (isBarrel) {
    const syms = barrelSymbols(src.file);
    if (syms === null) {
      drift.push(`${src.id}: file missing on disk (${src.file})`);
      return item;
    }
    if (syms.length === 0) {
      drift.push(`${src.id}: no @/lib/repositories barrel import found in ${src.file}`);
      return item;
    }
    const owners = [];
    for (const s of syms) {
      const owner = BARREL_SYMBOL_OWNER[s];
      if (!owner) {
        drift.push(`${src.id}: unmapped barrel symbol '${s}' in ${src.file}`);
        continue;
      }
      if (!owners.includes(owner)) owners.push(owner);
    }
    symbolResolution[src.id] = { file: src.file, symbols: syms, owners };
    targets = owners.map((o) => FACADE_BY_REPO[o]).filter(Boolean);
  } else {
    const repo = src.importedModule.split("/").pop();
    const facade = FACADE_BY_REPO[repo];
    if (facade) targets = [facade];
    symbolResolution[src.id] = { file: src.file, repository: repo, owners: [repo] };
  }

  if (targets.length === 0) {
    item.state = "BLOCKED";
    item.approvedTargetSurface = null;
    return item;
  }

  item.state = "READY";
  item.approvedTargetSurface = targets.join(" + ");

  for (const t of targets) {
    if (!facadesRequired.has(t)) facadesRequired.set(t, { facade: t, consumers: [] });
    facadesRequired.get(t).consumers.push(src.id);
  }
  return item;
});

// ---------- R2 Scope Integrity Gate ----------
const gate = [];
function check(name, ok, detail) {
  gate.push({ check: name, result: ok ? "PASS" : "FAIL", detail });
  if (!ok) drift.push(`${name}: ${detail}`);
}
check("predecessor hash matches F1_SCOPE_001", pred.scopeHash === PRED_HASH, pred.scopeHash);
check("item count == 37", items.length === 37, String(items.length));
check(
  "IDs unchanged",
  items.every((i, n) => i.id === pred.items[n].id),
  "ordered ID sequence identical",
);
check(
  "files unchanged",
  items.every((i, n) => i.file === pred.items[n].file),
  "all 37 file paths identical",
);
check(
  "batches unchanged",
  items.every((i, n) => i.batch === pred.items[n].batch),
  "F1-A=4 / F1-B=33 membership identical",
);
check(
  "currentEdge unchanged",
  items.every((i, n) => i.currentEdge === pred.items[n].currentEdge),
  "all 37 dependency edges identical",
);
check(
  "only state + approvedTargetSurface changed",
  items.every((i, n) => {
    const a = { ...i, state: null, approvedTargetSurface: null };
    const b = { ...pred.items[n], state: null, approvedTargetSurface: null };
    return JSON.stringify(a) === JSON.stringify(b);
  }),
  "no other field mutated",
);

const scopeHash = createHash("sha256")
  .update(
    JSON.stringify(
      items.map((i) => [i.id, i.batch, i.file, i.currentEdge, i.state, i.approvedTargetSurface]),
    ),
  )
  .digest("hex");

const existingFacades = new Set(
  [
    "attendance", "customer-search", "customers", "expenses", "products",
    "purchase-orders", "quotations", "reference", "sales-orders", "suppliers",
    "treasury", "admin",
  ].map((n) => `@/application/queries/${n}`),
);
const facadeList = [...facadesRequired.values()].map((f) => ({
  ...f,
  exists: existingFacades.has(f.facade),
  provenance: `${f.facade} ← pure re-export of src/lib/repositories/${Object.entries(FACADE_BY_REPO).find(([, v]) => v === f.facade)?.[0]}.ts`,
  consumerCount: f.consumers.length,
})).sort((a, b) => a.facade.localeCompare(b.facade));

const ready = items.filter((i) => i.state === "READY").length;
const blocked = items.filter((i) => i.state === "BLOCKED").length;
const gateResult = drift.length === 0 ? "PASS" : "SCOPE DRIFT — STOP";

const out = {
  schemaVersion: 1,
  unit: "F1-SCOPE-001-R2",
  status: gateResult === "PASS" ? "REVISED SCOPE — AWAITING HUMAN AUTHORIZATION FOR SOURCE MUTATION" : "SCOPE DRIFT REPORT",
  mode: "SCOPE REVISION ONLY — this script performs no source mutation",
  generatedAt: new Date().toISOString(),
  predecessor: { unit: "F1-SCOPE-001", scopeHash: PRED_HASH },
  humanDecision: "F1 Batched Execution Model — APPROVED FOR R2 PREPARATION (2026-09-03)",
  revisionReason:
    "Facade Rule authorized: a minimal pure re-export facade may be created when required to remediate an approved F1 edge. Supersedes C6 for facade-resolvable items only.",
  mutableFields: ["state", "approvedTargetSurface"],
  authorizedBatches: pred.authorizedBatches,
  authorizedItemCount: items.length,
  readyItemCount: ready,
  blockedItemCount: blocked,
  notAuthorized: pred.notAuthorized,
  classificationPreserved: pred.classificationPreserved,
  constraints: [
    ...pred.constraints.filter((c) => !c.startsWith("C6")),
    "C6-R2 — Missing target surface ⇒ one minimal PURE RE-EXPORT facade, or STOP. No implementation surface.",
    "C8 — Scope unit is the dependency edge, not the file. Unrelated edges in the same file are reported, never modified.",
    "C9 — Facade provenance must be declared: facade ← existing repository/application capability only.",
  ],
  integrityGate: { result: gateResult, checks: gate, driftFindings: drift },
  facadesRequired: facadeList,
  facadesToCreate: facadeList.filter((f) => !f.exists).length,
  facadesReused: facadeList.filter((f) => f.exists).length,
  symbolResolution,
  scopeHash,
  scopeHashAlgorithm: pred.scopeHashAlgorithm,
  items,
};

writeFileSync(join(OUT_DIR, "f1-scope-001-r2.json"), JSON.stringify(out, null, 2) + "\n");

// ---------------- Markdown ----------------
const L = [];
L.push("# F1_SCOPE_001-R2 — REVISED SCOPE (37 items)");
L.push("");
L.push("> Generated by `scripts/audits/f1-scope-001-r2.mjs`. **No source file was modified.**");
L.push("");
L.push(`- **Predecessor:** \`F1_SCOPE_001\` — hash \`${PRED_HASH}\``);
L.push(`- **New scope hash (SHA-256):** \`${scopeHash}\``);
L.push(`- **Hash input:** ${pred.scopeHashAlgorithm}`);
L.push(`- **R2 Scope Integrity Gate:** **${gateResult}**`);
L.push(`- **Status:** ${out.status}`);
L.push("");
L.push("## 1. Integrity gate");
L.push("");
L.push("| Check | Result | Detail |");
L.push("|---|---|---|");
for (const g of gate) L.push(`| ${g.check} | ${g.result} | ${g.detail} |`);
L.push("");
if (drift.length) {
  L.push("## Scope drift findings");
  L.push("");
  for (const d of drift) L.push(`- ${d}`);
  L.push("");
}
L.push("## 2. Execution state delta");
L.push("");
L.push("| | F1_SCOPE_001 | F1_SCOPE_001-R2 |");
L.push("|---|---:|---:|");
L.push(`| READY | ${pred.readyItemCount} | ${ready} |`);
L.push(`| BLOCKED | ${pred.blockedItemCount} | ${blocked} |`);
L.push(`| Items | 37 | ${items.length} |`);
L.push("");
L.push("## 3. Facades");
L.push("");
L.push(`Reused: **${out.facadesReused}** · To create (pure re-export): **${out.facadesToCreate}**`);
L.push("");
L.push("| Facade | Exists | Consumers | Provenance |");
L.push("|---|---|---:|---|");
for (const f of facadeList) {
  L.push(`| \`${f.facade}\` | ${f.exists ? "yes" : "NEW"} | ${f.consumerCount} | ${f.provenance} |`);
}
L.push("");
L.push("## 4. Items");
L.push("");
L.push("| ID | Batch | File | Current edge module | State | Approved target surface |");
L.push("|---|---|---|---|---|---|");
for (const i of items) {
  L.push(
    `| ${i.id} | ${i.batch} | \`${i.file}\` | \`${i.importedModule}\` | ${i.state} | ${i.approvedTargetSurface ? "`" + i.approvedTargetSurface + "`" : "—"} |`,
  );
}
L.push("");
L.push("## 5. Barrel symbol resolution (read-only inspection)");
L.push("");
L.push("| ID | File | Symbols | Owning repository |");
L.push("|---|---|---|---|");
for (const [id, r] of Object.entries(symbolResolution)) {
  if (!r.symbols) continue;
  L.push(`| ${id} | \`${r.file}\` | ${r.symbols.join(", ")} | ${r.owners.join(", ")} |`);
}
L.push("");
L.push("## 6. Next step");
L.push("");
L.push("No source mutation is permitted by this document. Human authorization of the R2 scope hash is required before F1-A / F1-B execution.");
L.push("");
writeFileSync(join(ROOT, "docs/governance/F1_SCOPE_001_R2.md"), L.join("\n"));

console.log(`[F1-R2] gate=${gateResult} ready=${ready} blocked=${blocked} facadesNew=${out.facadesToCreate}`);
console.log(`[F1-R2] scopeHash=${scopeHash}`);
if (gateResult !== "PASS") process.exit(1);
