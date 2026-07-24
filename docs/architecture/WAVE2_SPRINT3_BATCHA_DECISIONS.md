# Sprint 3.1 · Batch A — Architecture Decisions Ledger

Governance gate for every fix in this batch. No modification proceeds without an entry here (Phase 0.5 rule).

**Batch scope:** 25 UI files (pages/components) importing repositories directly.  
**Strategy:** Introduce thin application-layer facades under `src/application/queries/` and redirect UI imports there. Zero behavior change.

## Facade Rule Compliance

| Facade | UI Modules Consuming | Rule Pass |
|---|---:|:---:|
| `@/application/queries/customers` | 11 | ✅ ≥2 |
| `@/application/queries/suppliers` | 10 | ✅ ≥2 |
| `@/application/queries/products` | 6 | ✅ ≥2 |
| `@/application/queries/customer-search` | 4 | ✅ ≥2 |

All four facades satisfy: **reused by ≥2 UI modules** AND **represent a stable public application contract** (read-model surface).

## Decision Table

| # | File | Violation Type | Debt Class | Decision | Notes |
|---|---|---|---|---|---|
| 1 | pages/suppliers/SupplierPaymentsPage.tsx | ImportLeak | Dependency | FACADE | → queries/suppliers |
| 2 | pages/suppliers/SupplierDetailsPage.tsx | ImportLeak | Dependency | FACADE | → queries/suppliers |
| 3 | components/purchase-orders/PurchaseOrderFormDialog.tsx (supplier) | ImportLeak | Dependency | FACADE | → queries/suppliers |
| 4 | components/purchase-orders/PurchaseOrderFormDialog.tsx (product) | ImportLeak | Dependency | FACADE | → queries/products |
| 5 | components/expenses/ExpenseFormDialog.tsx | ImportLeak | Dependency | FACADE | → queries/suppliers |
| 6 | pages/customers/CustomerDetailsPage.tsx | ImportLeak | Dependency | FACADE | → queries/customers |
| 7 | components/products/ProductImportDialog.tsx | ImportLeak | Dependency | FACADE | → queries/products |
| 8 | components/products/ProductFormDialog.tsx | ImportLeak | Dependency | FACADE | → queries/products |
| 9 | pages/quotes/QuoteNewPage.tsx | ImportLeak | Dependency | FACADE | → queries/customers |
| 10 | components/customers/charts/AgingDonutChart.tsx | ImportLeak | Dependency | FACADE | → queries/customers |
| 11 | components/customers/dialogs/DuplicateDetectionDialog.tsx | ImportLeak | Dependency | FACADE | → queries/customer-search |
| 12 | components/customers/filters/CustomerSearchPreview.tsx | ImportLeak | Dependency | FACADE | → queries/customer-search |
| 13 | components/customers/filters/CustomerFiltersBar.tsx | ImportLeak | Dependency | FACADE | → queries/customers |
| 14 | components/suppliers/tabs/SupplierStatementTab.tsx | ImportLeak | Dependency | FACADE | → queries/suppliers |
| 15 | components/customers/details/StatementOfAccount.tsx | ImportLeak | Dependency | FACADE | → queries/customers |
| 16 | components/suppliers/tabs/SupplierAgingReport.tsx | ImportLeak | Dependency | FACADE | → queries/suppliers |
| 17 | components/customers/dialogs/CustomerAddressDialog.tsx | ImportLeak | Dependency | FACADE | → queries/customers |
| 18 | components/customers/dialogs/CustomerQuickAddDialog.tsx | ImportLeak | Dependency | FACADE | → queries/customers |
| 19 | components/customers/dialogs/CustomerFormDialog.tsx | ImportLeak | Dependency | FACADE | → queries/customers |
| 20 | components/customers/dialogs/CustomerMergeDialog.tsx | ImportLeak | Dependency | FACADE | → queries/customer-search |
| 21 | components/customers/dialogs/CustomerImportDialog.tsx | ImportLeak | Dependency | FACADE | → queries/customer-search |
| 22 | components/suppliers/SupplierRatingTab.tsx | ImportLeak | Dependency | FACADE | → queries/suppliers |
| 23 | components/suppliers/dialogs/SupplierQuickAddDialog.tsx | ImportLeak | Dependency | FACADE | → queries/suppliers |
| 24 | components/customers/details/CustomerHealthBadge.tsx | ImportLeak | Dependency | FACADE | → queries/customers |
| 25 | components/sales-orders/SalesOrderFormDialog.tsx (customer + product) | ImportLeak | Dependency | FACADE | → queries/customers + queries/products |
| 26 | components/customers/details/CustomerAgingReport.tsx | ImportLeak | Dependency | FACADE | → queries/customers |
| 27 | components/suppliers/charts/SupplierAgingChart.tsx | ImportLeak | Dependency | FACADE | → queries/suppliers |
| 28 | components/suppliers/hero/SupplierHealthBadge.tsx | ImportLeak | Dependency | FACADE | → queries/suppliers |
| 29 | components/logistics/LogisticsItemsTable.tsx (product) | ImportLeak | Dependency | FACADE | → queries/products |
| 30 | components/invoices/InvoiceFormDialog.tsx (customer + product) | ImportLeak | Dependency | FACADE | → queries/customers + queries/products |

**Executed decisions:** 30 FACADE redirects (target was 25; +5 clustering wins).  
**KEEP-DEFER:** None in this batch.  
**MOVE / EXTRACT / DELETE:** None in this batch (deferred to Sprint 3.2+ per Ledger).

## Constraint Compliance

- No edits under `src/kernel/**`, `src/platform/**`, `src/domain/**`, `src/infrastructure/**` — ✅
- No new `src/hooks/**` files created as ad-hoc facades — ✅
- No SQL, schema, edge function, or tokens changes — ✅
- No new Fitness enforcing checks flipped — ✅
- New Fitness (report-only): `check-public-surface-budget.mjs` — ✅
