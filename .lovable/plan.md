# Sprint 3.1 · Batch B — Residual `pages → repositories` Remediation

Scope frozen to the presentation layer. No behavior change, no business logic, no writes outside `src/pages/**`, `src/application/queries/**`, and docs.

## Current state (verified this turn)

27 page files still import `@/lib/repositories/*` directly. Distribution:

```text
admin/*            7 files  (adminMetrics, adminRepository, approval, settings, activityLogs)
accounting/finance 6 files  (journal, payment, expense x2, treasury x2, supplierPayment)
sales documents    6 files  (quotation x2, salesOrder, purchaseOrder, quotes/reference, tasks)
catalog/inventory  5 files  (product, category, priceList, inventory, expenseCategories)
misc               3 files  (approvals, attendance, tenants)
```

Existing facades: `customers`, `suppliers`, `products`, `customer-search` (all pure `export *`).

## Target

| Metric | Before | Batch B target |
|---|---:|---:|
| pages → repositories | 27 | ≤ 13 |
| Critical total | 171 | ≤ 155 |
| New public facades | — | ≤ 2 |
| `src/ui/index.ts` exports | 52 | 52 (unchanged) |
| UI cycles / total cycles | 0 / 6 | 0 / ≤ 6 |
| Architecture Score | 8.2 | ≥ 8.2 |

## Gate 2 — Reuse First (applied before any new file)

1. `products` facade already exists → `ProductDetailsPage`, `PriceListsPage`, `CategoriesPage`, `InventoryPage` route through it or through a widened `products` facade only if the widening is a pure re-export (no contract break).
2. Only where reuse is impossible do we add a facade — and only two, thematically grouped rather than one-per-repository:
   - `@/application/queries/documents` — quotation, salesOrder, purchaseOrder, reference (used by ≥4 pages).
   - `@/application/queries/finance` — journal, payment, expense, treasury, supplierPayment (used by ≥6 pages).
3. Single-consumer cases (`tasks`, `attendance`, `tenants`, `approvals`, admin-only repos) are **deferred**, not facaded — logged in the ledger with Owner Wave / ADR / Priority. This is why the target is ≤13 rather than 0.

## Execution

1. **Phase 0** — re-run `scripts/audits/dep-graph.mjs`, snapshot the exact 27 edges into `/tmp` as the working list.
2. **Phase 0.5** — decision table per file: `REUSE` / `FACADE` / `DEFER`, with the Gate 2 answer recorded.
3. **Phase 1** — create at most 2 facade modules (pure `export *`, no logic), register both in `src/application/queries/index.ts`.
4. **Phase 2** — redirect imports file by file; `tsgo` after each cluster.
5. **Phase 3** — re-audit: `dep-graph.mjs`, `ui-dep-graph.mjs`, `check-public-surface-budget.mjs`.
6. **Phase 4** — deliverables (below), then re-seal `architecture-fingerprint.json`.

## Deliverables

- `docs/architecture/WAVE2_SPRINT3_BATCHB_DECISIONS.md` — row-per-file decision table.
- `docs/architecture/WAVE2_SPRINT3_BATCHB_COMPARISON.md` — before/after + debt burn-down.
- `docs/architecture/WAVE2_SPRINT3_BATCHB_GRAPH_DIFF.md` — added/removed edges, FanIn/FanOut deltas, cycle diff.
- `docs/architecture/FACADE_REGISTRY.md` — **new**: consolidated table of every Wave 2 facade with the modules consuming it, status, and planned standardization wave (the report requested before Wave 2.5).
- Updates: `UI_API_V1.md` (new facades as `Pending Standardization`), `WAVE2_BATCH_2B_LEDGER.md` (deferrals with owners), `UI_HEALTH_REPORT.md` (post-3.1B column), ADR-0028 amendment noting the two grouped facades.
- Re-sealed `scripts/audits/output/architecture-fingerprint.json` + `wave2-sprint3-batchB.json`.

## Exit gate (all must hold)

Critical ≤ 155 · UI cycles = 0 · total cycles ≤ 6 · no FanOut regression on any file · `src/ui` public surface unchanged · new facades ≤ 2 and pure re-exports · `tsgo` green · fingerprint re-sealed.
