# Wave 1 — Sprint 3.1 Batch B · PHASE A (Audit Only)

> **No source file was modified in this phase.** Phase A and Phase B are read-only by contract.

## Evidence

| Field | Value |
|---|---|
| Evidence ID | WAVE1-PHASEA-001 |
| Snapshot ID | SNAPSHOT-20260826-001 |
| Baseline | BASELINE-NAZRA-001 (sealing correction below) |
| Git Commit (HEAD at audit) | `3b7b6c34e8b6a04b9c3a29017aaf1b01d7ffacea` |
| Commands | `node scripts/fitness/run-all.mjs`, `node scripts/audits/dep-graph.mjs`, `npx tsgo -p tsconfig.app.json`, `npx vite build` |
| Result | AUDIT COMPLETE — recommendation only |
| Owner | Human Governance |

### Baseline commit correction

Commit `2ef870b` does **not** contain all ten Wave 0 artifacts; the governance scaffolds and the inventory generator landed in later commits (`ca555160`, `a33f49b9`). `BASELINE-NAZRA-001` must therefore bind to **`a33f49b9`** (last Wave 0 artifact commit), not to `2ef870b`. Recorded here so sealing uses the final commit.

## Canonical counts (fitness output, not inventory observation)

| Metric | Canonical value | Source |
|---|---|---|
| Fitness checks active / pending / failures | 32 / 9 / **0** | `scripts/fitness/run-all.mjs` |
| Critical layer violations (total) | **171** | `dep-graph.mjs` → `importLayerViolations.total` |
| `components → repositories` | 41 | dep-graph |
| `components → supabase-client` | 38 | dep-graph |
| `hooks → supabase-client` | 31 | dep-graph |
| `pages → supabase-client` | 29 | dep-graph |
| `pages → repositories` | **27** | dep-graph |
| `components → services` | 5 | dep-graph |
| `domain → ui` | 0 | dep-graph |
| Cycles (total / UI) | 6 / 0 | dep-graph |
| Vite build | PASS | `vite build` |

The canonical "critical" set is the six enumerated layer-violation routes tracked by `dep-graph.mjs`. The inventory's 171 and the canonical 171 agree at this commit; the number is now sourced from the fitness/audit pipeline, not from the observation report.

## Decision Matrix — all 27 `pages → repositories` violations

Allowed actions only: `REDIRECT_EXISTING_FACADE`, `CREATE_GROUPED_FACADE`, `DEFER`, `OUT_OF_SCOPE`, `FALSE_POSITIVE`.

| # | File | Repository module | Kind | Severity | Existing facade | Consumers (pages+components) | Action | Expected result |
|---|---|---|---|---|---|---|---|---|
| 1 | pages/accounting/JournalEntriesPage.tsx | journalRepository | type-only | critical | — | 1 | DEFER | unresolved (single consumer) |
| 2 | pages/admin/ActivityLogPage.tsx | adminMetricsRepository | type-only | critical | — | 2 | CREATE_GROUPED_FACADE `admin` | resolved |
| 3 | pages/admin/ApprovalChainsPage.tsx | repositories/index (adminRepository) | value | critical | — | 5 | CREATE_GROUPED_FACADE `admin` | resolved |
| 4 | pages/admin/AuditTrailPage.tsx | adminMetricsRepository | type-only | critical | — | 2 | CREATE_GROUPED_FACADE `admin` | resolved |
| 5 | pages/admin/ExportTemplatesPage.tsx | repositories/index (adminRepository) | value | critical | — | 5 | CREATE_GROUPED_FACADE `admin` | resolved |
| 6 | pages/admin/PermissionsPage.tsx | repositories/index (adminRepository) | value | critical | — | 5 | CREATE_GROUPED_FACADE `admin` | resolved |
| 7 | pages/admin/SodRulesPage.tsx | repositories/index (adminRepository) | value | critical | — | 5 | CREATE_GROUPED_FACADE `admin` | resolved |
| 8 | pages/admin/TenantsPage.tsx | repositories/index (adminRepository) | value | critical | — | 5 | CREATE_GROUPED_FACADE `admin` | resolved |
| 9 | pages/approvals/ApprovalsPage.tsx | approvalRepository | type-only | critical | — | 1 | DEFER | unresolved (single consumer) |
| 10 | pages/attendance/AttendancePage.tsx | repositories/index (attendanceRepository) | value | critical | — | 2 | CREATE_GROUPED_FACADE `attendance` | resolved |
| 11 | pages/categories/CategoriesPage.tsx | repositories/_base (`mapRepoError`) | value | critical | — | 11 | DEFER | unresolved — utility relocation, not a redirect |
| 12 | pages/expenses/ExpenseCategoriesPage.tsx | repositories/_base (`mapRepoError`) | value | critical | — | 11 | DEFER | unresolved — same as #11 |
| 13 | pages/expenses/ExpensesPage.tsx | repositories/_base (`mapRepoError`) | value | critical | — | 11 | DEFER | unresolved — same as #11 |
| 14 | pages/expenses/ExpensesPage.tsx | expenseRepository | value | critical | — | 3 | CREATE_GROUPED_FACADE `expenses` | resolved |
| 15 | pages/inventory/InventoryPage.tsx | inventoryRepository | type-only | critical | — | 1 | DEFER | unresolved (single consumer) |
| 16 | pages/payments/PaymentsPage.tsx | paymentRepository | type-only | critical | — | 1 | DEFER | unresolved (single consumer) |
| 17 | pages/pricing/PriceListsPage.tsx | repositories/index (priceListRepository) | value | critical | — | 1 | DEFER | unresolved (single consumer) |
| 18 | pages/products/ProductDetailsPage.tsx | repositories/index (productRepository) | value | critical | `queries/products` | 7 | REDIRECT_EXISTING_FACADE | resolved |
| 19 | pages/purchase-orders/PurchaseOrdersPage.tsx | purchaseOrderRepository | type-only | critical | — | 2 | CREATE_GROUPED_FACADE `purchase-orders` | resolved |
| 20 | pages/quotations/QuotationDetailsPage.tsx | repositories/index (legacyQuotations + activityLogs) | value | critical | — | 5 / 1 | DEFER | unresolved — mixed import, `activityLogsRepository` is single-consumer |
| 21 | pages/quotations/QuotationsPage.tsx | repositories/index (legacyQuotationsRepository) | value | critical | — | 5 | CREATE_GROUPED_FACADE `quotations` | resolved |
| 22 | pages/quotes/QuoteNewPage.tsx | referenceRepository | value | critical | — | 3 | CREATE_GROUPED_FACADE `reference` | resolved |
| 23 | pages/sales-orders/SalesOrdersPage.tsx | salesOrderRepository | type-only | critical | — | 2 | CREATE_GROUPED_FACADE `sales-orders` | resolved |
| 24 | pages/suppliers/SupplierPaymentsPage.tsx | supplierPaymentRepository | value | critical | — | 1 | DEFER | unresolved (single consumer) |
| 25 | pages/tasks/TasksPage.tsx | repositories/index (tasksRepository) | value | critical | — | 1 | DEFER | unresolved (single consumer) |
| 26 | pages/treasury/CashRegisterDetailsPage.tsx | treasuryRepository | value | critical | — | 2 | CREATE_GROUPED_FACADE `treasury` | resolved |
| 27 | pages/treasury/TreasuryPage.tsx | treasuryRepository | type-only | critical | — | 2 | CREATE_GROUPED_FACADE `treasury` | resolved |

### Totals

| Action | Rows |
|---|---:|
| REDIRECT_EXISTING_FACADE | 1 |
| CREATE_GROUPED_FACADE | 15 |
| DEFER | 11 |
| OUT_OF_SCOPE | 0 |
| FALSE_POSITIVE | 0 |

**Projected `pages → repositories`: 27 → 11** (target ≤ 13 — achievable).
**Projected critical total: 171 → 155** (target ≤ 155 — met exactly at the boundary).

## Proposed new facades (all four rule conditions verified)

| Facade | Wraps | Consumers | Same read concern | Same responsibility | No business-logic leakage |
|---|---|---:|:--:|:--:|:--:|
| `@/application/queries/admin` | `adminRepository`, `adminMetricsRepository` | 7 | admin/governance console reads | yes | pure re-export |
| `@/application/queries/treasury` | `treasuryRepository` | 2 | cash register / transactions | yes | pure re-export |
| `@/application/queries/expenses` | `expenseRepository` | 3 | expense reads | yes | pure re-export |
| `@/application/queries/reference` | `referenceRepository` | 3 | shared reference lookups | yes | pure re-export |
| `@/application/queries/attendance` | `attendanceRepository` | 2 | attendance reads | yes | pure re-export |
| `@/application/queries/quotations` | `legacyQuotationsRepository` | 5 | quotation reads | yes | pure re-export |
| `@/application/queries/sales-orders` | `salesOrderRepository` | 2 | sales order reads | yes | pure re-export |
| `@/application/queries/purchase-orders` | `purchaseOrderRepository` | 2 | purchase order reads | yes | pure re-export |

No `finance.ts` / `documents.ts` catch-all is proposed. `admin` is the only two-repository facade; it is accepted because both modules serve one coherent read concern (the admin console), and it is flagged for review at Wave 2.5 standardization.

## Why the 11 deferred rows are not a hidden architectural problem

- 8 rows are genuinely single-consumer repositories. Wrapping them would create low-reuse facades — explicitly prohibited.
- 3 rows (`#11`, `#12`, `#13`) are not repository reads at all: they import `mapRepoError` from `repositories/_base`, an error-mapping utility with 11 consumers. The correct fix is relocating it to a shared error module — a **move**, outside Batch B's redirect-only contract. Recommended as its own change unit in a later batch.

This is a residue of scope, not a boundary failure. **REVIEW-001 recommendation: A** (scope valid, remediable inside the frozen contract) — recommendation only; the decision is the reviewer's.

## PHASE B — STOP

Phase C requires human approval and the freezing of `BATCHB-SCOPE-001` (approved files, facade targets, new facades, excluded files, expected delta). Files not in that scope must not be touched.
