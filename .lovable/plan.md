# Phase 1C — Batch A2: Read-only Reuse Cluster (revised)

Builds on a clean Gate A1 (100% file-level reuse, 0 new repos, 1187/1187 green). A2 tests a stronger hypothesis: **existing repository surfaces are sufficient — zero method additions required**.

## Scope (single cluster, Reuse-only)

12 files, all classified **Reuse** in the frozen inventory. Zero Extend, zero New, zero exceptions in this cluster.

Reports:
1. `src/components/reports/AgingReport.tsx` → `reportsRepository`
2. `src/components/reports/GeographicReport.tsx` → `reportsRepository`
3. `src/components/reports/InactiveCustomersReport.tsx` → `customerRepository`
4. `src/components/reports/IncomeStatementReport.tsx` → `reportsRepository`
5. `src/components/reports/InventoryFlowReport.tsx` → `inventoryRepository`
6. `src/components/reports/ProfitabilityReport.tsx` → `reportsRepository`
7. `src/components/reports/TrialBalanceReport.tsx` → `reportsRepository`

Customer/Supplier read tabs:
8. `src/components/customers/details/CustomerPinnedNote.tsx` → `customerRepository`
9. `src/components/suppliers/hero/SupplierPinnedNote.tsx` → `supplierRepository`
10. `src/components/suppliers/SupplierActivityTab.tsx` → `supplierRepository`
11. `src/components/suppliers/SupplierProductsTab.tsx` → `supplierRepository`
12. `src/components/suppliers/SupplierRatingTab.tsx` → `supplierRepository`

## Execution rules

- Route call sites only. **Do not** move business logic, transform payloads, or change DTOs/contracts.
- **No new repositories. No new methods.** Even a one-line pass-through (`select * where id=...`) counts as a violation.
- `// repo-exception:` markers are not added in this cluster (exception files belong to a later one).

## Success criteria (all must hold — addition 1: Zero-Extend is explicit)

| Metric | Target |
|---|---|
| Existing methods reused | **100%** |
| New methods added | **0** |
| New repositories | **0** |
| New exception categories | **0** |
| Public Repository API changes | **0** (addition 3) |
| Reclassified files mid-cluster | **0** |
| Audit script unjustified hits removed | 12 (the cluster files) |
| Vitest | 1187/1187 green |
| ESLint | no new errors |
| `tsc --noEmit` | clean |
| Repository Growth Review | no responsibility drift, no God-Repository approach (addition 2) |

## Violation handling

If any file needs a new method to be migrated:
1. **Stop the cluster immediately** — do not "fix" the classification inline.
2. Reclassify that file from Reuse → Extend in `docs/architecture/data-orchestration-batchA.md`.
3. Update the inventory totals.
4. Re-run A2 **excluding** that file.
5. Surface the reclassification in the closing report.

A failed classification is **not** a design failure; it is an Inventory accuracy issue and is treated as such.

## Reporting additions to `docs/architecture/data-orchestration-batchA.md`

Append a new "Cluster Reviews" section with:

**1. Repository Growth Review (per cluster)** — addition 2, expanded columns:

| Repository | Public methods before | Public methods after | Read methods | Write methods | Aggregate(s) covered | Responsibility drift? |
|---|---|---|---|---|---|---|

Concern triggers (any one → stop and discuss):
- A repo's `Aggregate(s) covered` lists more than one distinct aggregate.
- Responsibility kinds (CRUD + Reports + Search + Analytics + Sync) start mixing in one repo.
- Public method count crosses ~25 **and** any of the above is true.
- Count alone (~25) without drift = informational, not a stop.

**2. Extension Distribution (cumulative across Batch A)**:

| Repository | +Methods cumulative (A1 + A2 + …) |
|---|---|

Early signal for future Read Model / Query Object split; not a stop condition by itself.

**3. Repository API Regression Check (addition 3)** — one line per touched repo:

| Repository | Signature changes | Backward compatible? | Callers outside cluster needing edits |
|---|---|---|---|

Expected for A2: **all zeros**. Any non-zero entry must be justified inline or it fails the gate.

## Out of scope (unchanged)

- No `createMutation` / `createQuery` factories.
- No `useFormDialog` changes.
- No cache-policy or optimistic-update changes.
- No business validation, permission, or payload-transformation moves.
- No Extend / New / Exception work in this cluster.

## Mandatory stop after A2

On clean pass, present the three review tables + audit/test output and **wait for explicit approval** before starting the next cluster (Extend-class admin/platform pages). No auto-continuation.
