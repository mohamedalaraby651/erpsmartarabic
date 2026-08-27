# Wave 1 — Sprint 3.1 Batch B · PHASE C1 (Scope Freeze + Execution Plan)

> **No source file was modified for Batch B in this phase.** C1 is planning only. C2 begins only after human review of the table below.

| Field | Value |
|---|---|
| Evidence ID | WAVE1-PHASEC1-001 |
| Baseline | BASELINE-NAZRA-001 @ `a33f49b9` |
| Contract | `docs/governance/BATCHB_SCOPE_001.md` (LOCKED) |
| Source matrix | `docs/architecture/WAVE1_SPRINT3_BATCHB_PHASEA.md` |
| Authorized items | 16 (1 redirect + 15 grouped-facade) |
| Deferred items | 11 (non-reclassifiable) |
| New facades | 8 |

## Execution plan — 16 authorized items

Import kinds: **T** = type-only (`import type`, must remain type-only), **V** = value import (facade must re-export the identical symbol; unchanged runtime semantics).

| # | File | Current import | Kind | Target facade | New/Existing | Consumers | Reason | Expected dependency delta | Risk |
|---|---|---|---|:--:|---|---:|---|---|---|
| 1 | `pages/products/ProductDetailsPage.tsx` | `{ productRepository } from '@/lib/repositories'` | V | `@/application/queries/products` | Existing | 7 | Facade already exists and re-exports `productRepository` | −1 `pages → repositories`; −1 edge to `repositories/index` | Low |
| 2 | `pages/admin/ActivityLogPage.tsx` | `type { ActivityLogEntry } from '@/lib/repositories/adminMetricsRepository'` | T | `@/application/queries/admin` | New | 7 | Admin console read concern | −1; +1 `pages → application` | Very low (type-only) |
| 3 | `pages/admin/AuditTrailPage.tsx` | `type { AuditTrailEntry } from '@/lib/repositories/adminMetricsRepository'` | T | `@/application/queries/admin` | New | 7 | Same read concern | −1; +1 | Very low (type-only) |
| 4 | `pages/admin/ApprovalChainsPage.tsx` | `{ adminRepository } from '@/lib/repositories'` | V | `@/application/queries/admin` | New | 7 | Admin governance reads | −1; +1 | Low |
| 5 | `pages/admin/ExportTemplatesPage.tsx` | `{ adminRepository } from '@/lib/repositories'` | V | `@/application/queries/admin` | New | 7 | Admin governance reads | −1; +1 | Low |
| 6 | `pages/admin/PermissionsPage.tsx` | `{ adminRepository } from '@/lib/repositories'` | V | `@/application/queries/admin` | New | 7 | Admin governance reads | −1; +1 | Low |
| 7 | `pages/admin/SodRulesPage.tsx` | `{ adminRepository } from '@/lib/repositories'` | V | `@/application/queries/admin` | New | 7 | Admin governance reads | −1; +1 | Low |
| 8 | `pages/admin/TenantsPage.tsx` | `{ adminRepository } from '@/lib/repositories'` | V | `@/application/queries/admin` | New | 7 | Admin governance reads | −1; +1 | Low |
| 9 | `pages/attendance/AttendancePage.tsx` | `{ attendanceRepository } from '@/lib/repositories'` | V | `@/application/queries/attendance` | New | 2 | Attendance reads | −1; +1 | Low |
| 10 | `pages/expenses/ExpensesPage.tsx` | `{ expenseRepository } from '@/lib/repositories/expenseRepository'` | V | `@/application/queries/expenses` | New | 3 | Expense reads | −1; +1 | Low — the `mapRepoError` import in the same file is **deferred row #13 and must stay untouched** |
| 11 | `pages/purchase-orders/PurchaseOrdersPage.tsx` | `type { PurchaseOrderRow } from '@/lib/repositories/purchaseOrderRepository'` | T | `@/application/queries/purchase-orders` | New | 2 | Purchase order reads | −1; +1 | Very low (type-only) |
| 12 | `pages/quotations/QuotationsPage.tsx` | `{ legacyQuotationsRepository } from '@/lib/repositories'` | V | `@/application/queries/quotations` | New | 5 | Quotation reads | −1; +1 | Low |
| 13 | `pages/quotes/QuoteNewPage.tsx` | `{ referenceRepository } from '@/lib/repositories/referenceRepository'` | V | `@/application/queries/reference` | New | 3 | Shared reference lookups | −1; +1 | Low |
| 14 | `pages/sales-orders/SalesOrdersPage.tsx` | `type { SalesOrderRow } from '@/lib/repositories/salesOrderRepository'` | T | `@/application/queries/sales-orders` | New | 2 | Sales order reads | −1; +1 | Very low (type-only) |
| 15 | `pages/treasury/CashRegisterDetailsPage.tsx` | `type { CashRegisterRow, CashTransactionRow } from '@/lib/repositories/treasuryRepository'` | T | `@/application/queries/treasury` | New | 2 | Cash register reads | −1; +1 | Very low (type-only) |
| 16 | `pages/treasury/TreasuryPage.tsx` | `type { CashRegisterRow } from '@/lib/repositories/treasuryRepository'` | T | `@/application/queries/treasury` | New | 2 | Cash register reads | −1; +1 | Very low (type-only) |

Kind totals: 7 type-only · 9 value.

## Facade files to create (8) — thin pure re-exports

| Facade file | Re-exports | Symbols relied on by the rows above |
|---|---|---|
| `src/application/queries/admin.ts` | `@/lib/repositories/adminRepository`, `@/lib/repositories/adminMetricsRepository` | `adminRepository`, `type ActivityLogEntry`, `type AuditTrailEntry` |
| `src/application/queries/treasury.ts` | `@/lib/repositories/treasuryRepository` | `type CashRegisterRow`, `type CashTransactionRow` |
| `src/application/queries/expenses.ts` | `@/lib/repositories/expenseRepository` | `expenseRepository` |
| `src/application/queries/reference.ts` | `@/lib/repositories/referenceRepository` | `referenceRepository` |
| `src/application/queries/attendance.ts` | `@/lib/repositories/attendanceRepository` | `attendanceRepository` |
| `src/application/queries/quotations.ts` | `@/lib/repositories/legacyQuotationsRepository` | `legacyQuotationsRepository` |
| `src/application/queries/sales-orders.ts` | `@/lib/repositories/salesOrderRepository` | `type SalesOrderRow` |
| `src/application/queries/purchase-orders.ts` | `@/lib/repositories/purchaseOrderRepository` | `type PurchaseOrderRow` |

Supporting file, declared explicitly (not silent): `src/application/queries/index.ts` — the public barrel gains eight namespace exports so the surface stays single-entry. It is inside the approved set and inside the scope hash.

### Per-facade admission proofs

| Facade | ≥2 consumers | Coherent responsibility | Wraps existing repo/query | No business logic | Not hook-as-facade | No semantic change |
|---|:--:|:--:|:--:|:--:|:--:|:--:|
| admin (7) | yes | admin console reads | yes | yes | yes | pure re-export |
| treasury (2) | yes | cash register / transactions | yes | yes | yes | pure re-export |
| expenses (3) | yes | expense reads | yes | yes | yes | pure re-export |
| reference (3) | yes | shared reference lookups | yes | yes | yes | pure re-export |
| attendance (2) | yes | attendance reads | yes | yes | yes | pure re-export |
| quotations (5) | yes | quotation reads | yes | yes | yes | pure re-export |
| sales-orders (2) | yes | sales order reads | yes | yes | yes | pure re-export |
| purchase-orders (2) | yes | purchase order reads | yes | yes | yes | pure re-export |

`admin` is the only two-repository facade; both modules serve one coherent admin-console read concern. Flagged for Wave 2.5 standardization review.

## Deferred — 11 rows, untouched by C2

| # (Phase A) | File | Reason |
|---|---|---|
| 1 | `pages/accounting/JournalEntriesPage.tsx` | single consumer |
| 9 | `pages/approvals/ApprovalsPage.tsx` | single consumer |
| 11 | `pages/categories/CategoriesPage.tsx` | `mapRepoError` — utility relocation, not a redirect |
| 12 | `pages/expenses/ExpenseCategoriesPage.tsx` | `mapRepoError` |
| 13 | `pages/expenses/ExpensesPage.tsx` | `mapRepoError` (same file as authorized row 10, different import — must stay) |
| 15 | `pages/inventory/InventoryPage.tsx` | single consumer |
| 16 | `pages/payments/PaymentsPage.tsx` | single consumer |
| 17 | `pages/pricing/PriceListsPage.tsx` | single consumer |
| 20 | `pages/quotations/QuotationDetailsPage.tsx` | mixed import, single-consumer `activityLogsRepository` |
| 24 | `pages/suppliers/SupplierPaymentsPage.tsx` | single consumer |
| 25 | `pages/tasks/TasksPage.tsx` | single consumer |

## Evidence commands for C2 (before + after)

```text
npx tsgo -p tsconfig.app.json --noEmit
npx vite build
npm run lint
npx vitest run
node scripts/fitness/run-all.mjs
node scripts/audits/dep-graph.mjs
node scripts/audits/codebase-inventory.mjs
git status --short
git diff --stat
git diff --name-only        # → normalize → sort → exact set equality vs approved list
```

## Scope Integrity

```text
Scope Integrity
───────────────
Baseline: BASELINE-NAZRA-001
Commit:   a33f49b9

Authorized remediation items: 16   (1 redirect + 15 grouped-facade)
Deferred items:               11   (untouched, non-reclassifiable)
New facade count:              8

Approved facade files (9, incl. declared supporting barrel):
  src/application/queries/admin.ts
  src/application/queries/attendance.ts
  src/application/queries/expenses.ts
  src/application/queries/index.ts
  src/application/queries/purchase-orders.ts
  src/application/queries/quotations.ts
  src/application/queries/reference.ts
  src/application/queries/sales-orders.ts
  src/application/queries/treasury.ts

Approved source files (16):
  src/pages/admin/ActivityLogPage.tsx
  src/pages/admin/ApprovalChainsPage.tsx
  src/pages/admin/AuditTrailPage.tsx
  src/pages/admin/ExportTemplatesPage.tsx
  src/pages/admin/PermissionsPage.tsx
  src/pages/admin/SodRulesPage.tsx
  src/pages/admin/TenantsPage.tsx
  src/pages/attendance/AttendancePage.tsx
  src/pages/expenses/ExpensesPage.tsx
  src/pages/products/ProductDetailsPage.tsx
  src/pages/purchase-orders/PurchaseOrdersPage.tsx
  src/pages/quotations/QuotationsPage.tsx
  src/pages/quotes/QuoteNewPage.tsx
  src/pages/sales-orders/SalesOrdersPage.tsx
  src/pages/treasury/CashRegisterDetailsPage.tsx
  src/pages/treasury/TreasuryPage.tsx

Canonicalization: POSIX separators → LC_ALL=C lexicographic sort
                  → newline-delimited text → SHA-256
Scope Hash: eab102bd71ccd916f5cf32284d27d0b03ed32008b0849b18687740f7fa32eb84

C2 may modify ONLY:
- approved source files
- approved facade files
- explicitly listed supporting files (only src/application/queries/index.ts)

Verification is EXACT SET EQUALITY (Actual == Approved), not Actual ⊆ Approved.

Any file outside this set:            STOP
Any new architectural decision:       STOP
Any change to a deferred item:        STOP
Any DB/RLS/SQL/Edge Function change:  STOP
```

Documentation files updated by C2 (`PROGRESS_LOG.md`, `SCOREBOARD.md`, the C2 record and its JSON evidence) are governance artifacts, not source; they are audited separately and are excluded from the source scope hash by design.

## Baseline chain

```text
BASELINE-NAZRA-001 @ a33f49b9
        + Phase A evidence
        + C1 scope hash
        + C1 decision matrix
                ↓
              C2
                ↓
        delta + fresh evidence
                ↓
        BASELINE-NAZRA-002   (human approval only)
```

No full project re-analysis is performed at C2.

---

```text
PHASE C1 — COMPLETE
Implementation:  VERIFIED
Source Changes:  0
Scope:           FROZEN
Evidence:        AVAILABLE
Certification:   NOT CERTIFIED

STOP — HUMAN REVIEW REQUIRED
```
