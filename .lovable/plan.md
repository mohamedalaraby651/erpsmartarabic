# Phase 1B — COMPLETE ✅

## Status
**Phase 1B Tier 2 closed.** All 3 batches migrated; 1187/1187 tests; grep audit clean on every batch.

### Tier 1 (POC) ✅
- `CategoryFormDialog`, `WarehouseFormDialog`, `ExpenseCategoryFormDialog`, `SupplierFormDialog`

### Tier 2 Batch 1 — Low-risk financial ✅
- `ExpenseFormDialog`
- `PaymentFormDialog` (synthetic-entity reset pattern)
- `JournalFormDialog` (header in hook; lines external)

### Tier 2 Batch 2 — Header + line items ✅
- `PurchaseOrderFormDialog`
- `SalesOrderFormDialog`
- **State Boundary Rule applied:** items live outside `useFormDialog` and merge in `mutationFn`.

### Tier 2 Batch 3 — Critical financial logic ✅
- `InvoiceFormDialog`
- `QuotationFormDialog`
- **Pre-MUTATE discipline:** `validate → server-validate / permission / financial-limit → transform → submit`, all inside `mutationFn`. Wizard navigation, draft, and post-save print state stay external (documented exceptions to the lifecycle).

## Contract Integrity
- `useFormDialog.ts` — **unchanged** since end of Tier 1 (frozen rule honored).
- `FormDialogFooter.tsx`, `FormFieldError.tsx` — unchanged.

## Migration Inventory (12 forms total)
Tier 1: 4 · Tier 2: 7 · Migrated total: **≥ 11** (well above 80% threshold for in-scope dialog forms).

## Regression Gates (each batch — ALL PASS)
- Vitest 1187/1187
- ESLint clean on touched files
- Grep audit (zero hits): `useEffect.*reset`, `toast\(`, `toast\.success`, `try { ... mutate`, `setState.*reset`, `reset.*entity`

## Phase 1B Exit Criteria — Done
- [x] All 7 Tier 2 forms migrated.
- [x] Zero TS/ESLint regressions.
- [x] 1187/1187 vitest pass.
- [x] `useFormDialog.ts` unchanged from end of Tier 1.
- [x] Docs updated with line-items + pre-MUTATE + wizard-exception patterns.

## Next — Phase 1C (Proposed)
**Data Orchestration Layer:** unify Repository + Query + Cache + Optimistic consistency across the codebase. Targets the remaining drift between `*Repository`, `*Service`, and direct `useQuery`/`useMutation` call sites.
