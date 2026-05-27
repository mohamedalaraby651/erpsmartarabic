# Track B — Wave 2: Hooks Parity Expansion

Baseline confirmed green (**1187/1187 tests** ✅). Track B Wave 1 closed the original 8 pages. Wave 2 extends the same pattern to the next highest-impact surfaces, where 91 files still import `@/integrations/supabase/client` directly.

## Scope (Wave 2 only — 14 files)

Focused on user-facing CRUD surfaces and shared form dialogs. Platform/admin/reports stay deferred to Wave 3.

### Categories & Expense Categories

- `pages/categories/CategoriesPage.tsx`
- `pages/expenses/ExpenseCategoriesPage.tsx`
- `components/categories/CategoryFormDialog.tsx`
- `components/expenses/ExpenseCategoryFormDialog.tsx`
- `components/expenses/ExpenseFormDialog.tsx`

### Treasury form dialogs

- `components/treasury/CashRegisterFormDialog.tsx`
- `components/treasury/CashTransactionDialog.tsx`

### Quotations & Credit Notes form dialogs

- `components/quotations/QuotationFormDialog.tsx`
- `components/quotations/useQuotationItems.ts`
- `components/credit-notes/CreditNoteFormDialog.tsx`

### Pages with leftover inline calls

- `pages/quotes/QuoteNewPage.tsx`
- `pages/quotes/SalesPipelinePage.tsx`
- `pages/suppliers/SupplierDetailsPage.tsx`
- `pages/collections/CollectionDashboard.tsx`

## Repository additions / extensions

```text
src/lib/repositories/
├── categoryRepository.ts          (new)  list/get/create/update/delete + tree
├── expenseRepository.ts           (ext)  category CRUD
├── treasuryRepository.ts          (ext)  createRegister/updateRegister + recordCashTxn
├── quotationRepository.ts         (ext)  pipeline aggregates + items helpers
├── creditNoteRepository.ts        (ext)  draft/create wrappers
├── supplierRepository.ts          (ext)  supplier details bundle (notes, contacts)
└── collectionRepository.ts        (new)  collection dashboard counters
```

All methods route errors through `mapRepoError`. No RPC, RLS, or schema changes.

## Hook additions

```text
src/hooks/
├── categories/   useCategories, useCreateCategory, useUpdateCategory, useDeleteCategory
├── treasury/     useCreateCashRegister, useUpdateCashRegister, useRecordCashTransaction
├── quotations/   usePipelineSummary, useQuotationItemsEditor helpers
├── credit-notes/ useCreateCreditNoteDraft
└── collections/  useCollectionCounters
```

Existing `treasury` / `expenses` / `approvals` barrels are extended in place.

## Per-file rewire contract

1. Remove `import { supabase } from "@/integrations/supabase/client"`.
2. Replace each `supabase.from(...)` with the matching hook (queries) or `await repo.method()` inside an existing mutation handler.
3. Pipe every `catch` through `mapRepoError` → `toast()` (Arabic).
4. Preserve existing prop signatures, validation, and tenant flow (RLS implicit).

## Out of scope (Wave 3 candidates)

- `pages/platform/*`, `pages/admin/UsersPage`, `RolesPage`, `RoleLimitsPage`, `BackupPage`, `CustomizationsPage`, `DispatcherBatches*`, `DomainEventsPage`
- `components/reports/*` (Trial Balance, Profitability, Aging, Inventory Flow, Income Statement, Geographic, Inactive Customers)
- `pages/reports/*`, `pages/sync/SyncStatusPage`, `pages/search/SearchPage`, `pages/dev/PdfJobsPage`
- `pages/settings/UnifiedSettingsPage`, `pages/employees/EmployeeDetailsPage`, `pages/attachments/AttachmentsPage`
- Auth flows (`Auth`, `ForgotPassword`, `ResetPassword`, `TwoFactorSetup`) — Supabase Auth client is the correct API there
- `useRestoreBackup.ts`

## Baseline protection

- After each domain merge: `bunx vitest run` must stay 1187+ green.
- No edits to `src/integrations/supabase/{client,types}.ts`, `supabase/config.toml`, or migrations.
- No changes to function signatures consumed elsewhere.
- `supplierService.recordSupplierPayment` atomic RPC chain stays untouched.

## Deliverables

- 2 new + 5 extended repositories
- 5 hook folders updated/created with `index.ts` barrels
- 14 files purged of direct `@/integrations/supabase/client` imports
- `bunx vitest run` → 1187+ passing, zero regressions
- Act as a Lead Frontend Architect and React Query Expert specialized in clean enterprise architecture. Track B Wave 1 is perfectly closed with 1187/1187 green tests. Now, we are officially executing "Track B — Wave 2: Hooks Parity Expansion" to purge raw database client imports from 14 high-impact CRUD pages and form dialogs.

Please systematically implement the following repository extensions, hooks, and page rewires while keeping our 1187+ test suite flawless:

&nbsp;

1. Create & Extend Repository Layer (`src/lib/repositories/`):

- `categoryRepository.ts` (New): Implement `list()`, `get(id)`, `create()`, `update()`, `delete()`, and hierarchical `tree()`.

- `expenseRepository.ts` (Extend): Add Category CRUD methods.

- `treasuryRepository.ts` (Extend): Add `createRegister()`, `updateRegister()`, and `recordCashTxn()`.

- `quotationRepository.ts` (Extend): Add sales pipeline metrics aggregates and items helper fetchers.

- `creditNoteRepository.ts` (Extend): Add `draft()` and `create()` transaction wrappers.

- `supplierRepository.ts` (Extend): Bundle supplier details fetchers (including notes and contacts).

- `collectionRepository.ts` (New): Add collection dashboard counters and aggregations.

* Note: Ensure EVERY single repo method routes its catch block exceptions strictly through our global `mapRepoError` translator.

&nbsp;

2. Build & Update Hook Barrels (`src/hooks/`):

- Create/extend the following folders with standard index.ts barrels and unified `queryPresets`:

  a. `categories/`: `useCategories`, `useCreateCategory`, `useUpdateCategory`, `useDeleteCategory`.

  b. `treasury/`: `useCreateCashRegister`, `useUpdateCashRegister`, `useRecordCashTransaction`.

  c. `quotations/`: `usePipelineSummary`, `useQuotationItemsEditor`.

  d. `credit-notes/`: `useCreateCreditNoteDraft`.

  e. `collections/`: `useCollectionCounters`.

- Enforce full query caching invalidation (`invalidateQueries`) so that triggering any mutation hooks automatically refetches its respective dashboard counters or grid listings.

&nbsp;

3. Complete Form Dialogs & Page Purge (14 Files Refactor):

- Completely REMOVE `import { supabase } from "@/integrations/supabase/client"` from the following 14 files and re-wire them to cleanly consume your newly minted hooks and repo methods:

  - Categories: `CategoriesPage.tsx`, `ExpenseCategoriesPage.tsx`, `CategoryFormDialog.tsx`, `ExpenseCategoryFormDialog.tsx`, `ExpenseFormDialog.tsx`.

  - Treasury: `CashRegisterFormDialog.tsx`, `CashTransactionDialog.tsx`.

  - Quotes/Credit Notes: `QuotationFormDialog.tsx`, `useQuotationItems.ts`, `CreditNoteFormDialog.tsx`, `QuoteNewPage.tsx`, `SalesPipelinePage.tsx`.

  - Leftovers: `SupplierDetailsPage.tsx`, `CollectionDashboard.tsx`.

- Ensure all mutation error handling explicitly triggers native Arabic toast notifications via `mapRepoError`. Preserve all existing layout styles, validation configurations, and implicit RLS contexts.

&nbsp;

4. Baseline Protection Guardrail:

- Do not modify any out-of-scope candidates (platform admin, reports components, auth flows, or `supplierService.recordSupplierPayment`).

- Run `bunx vitest run` upon completing this sweep to verify that our 1187+ green test suite baseline remains completely stable and uncompromised!

&nbsp;