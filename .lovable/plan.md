# Phase 1B — Tier 2: Financial Forms Migration (APPROVED — Controlled Expansion)

## Status
Tier 1 POC closed (Category, Warehouse, ExpenseCategory) — 1187/1187 tests, ESLint clean, contract validated. `useFormDialog` is **FROZEN** for Tier 2.

## Execution Order (Strict Batched Rollout)

### Batch 1 — Low-risk financial CRUD
1. `ExpenseFormDialog` — single record, no line items
2. `PaymentFormDialog` — single record
3. `JournalFormDialog` — header only (lines stay external as nested state)

→ **GATE 1** → STOP for review

### Batch 2 — Medium complexity (header + line items)
4. `PurchaseOrderFormDialog`
5. `SalesOrderFormDialog`

**State Boundary Rule:** line items stay **outside** `useFormDialog` (nested local state / reducer). The hook owns the header only. Items are merged into payload inside `toPayload`.

→ **GATE 2** → STOP for review

### Batch 3 — Critical financial logic
6. `InvoiceFormDialog`
7. `QuotationFormDialog`

**Pre-MUTATE discipline inside `mutationFn`:**
```
validateInvoice() → transformPayload() → submit()
```
No branching in component layer. No bypass of lifecycle.

→ **GATE 3** → Phase 1B closure

## Frozen Contract (Tier 2)
- `useFormDialog.ts` — no edits unless bug affects >1 form (documented).
- `FormDialogFooter.tsx`, `FormFieldError.tsx` — no edits.
- All migrations consume the existing contract verbatim.

## Per-Form Migration Rules
Each migrated form MUST:
1. Use `useFormDialog<Schema, Entity, Payload>` with `schema`, `entity`, `toValues`, `toPayload`, `mutationFn`.
2. Branch create/update **inside** `mutationFn` (not in component).
3. Component layer only handles: `onSuccess` (toast + `onOpenChange(false)`), `onError` (toast via `useMutationToast` / `mapRepoError`).
4. Remove: `useEffect(reset)`, inline `try/catch`, manual `toast()` inside submit, `isPending` aggregation.
5. Use `FormDialogFooter` (or keep existing footer if it already matches contract).

## Regression Gates (After EACH batch — mandatory)
1. **Vitest**: `bunx vitest run` → 1187+/1187+ passing.
2. **ESLint**: clean on all touched files.
3. **Manual lifecycle**: `open → edit → submit → close → reopen → reset verified → error path verified` on one form per batch.
4. **Static audit (grep) — hardened ruleset**:
   - `useEffect.*reset`
   - `toast\(` inside submit handler scope
   - `try\s*{[^}]*mutate` patterns
   - `setState.*reset`
   - `reset.*entity` (manual entity-driven resets)
   - `toast\.success` inside submit scope
   Zero hits required on migrated files.

If any gate fails → **rollback batch**, do not proceed.

## Anti-Pattern Watchlist (Immediate Rollback Triggers)
- `useEffect(reset)` reappears
- Inline `toast()` inside submit logic
- Duplicated `try/catch` around mutation
- Form-specific lifecycle logic bypassing `useFormDialog`
- TS escape hatches (`any`, `as unknown`)
- `mutationFn` becoming a "god function" (>1 responsibility beyond validate→transform→submit)

## Definition of Done (Phase 1B Exit)
- ≥ 17/21 forms migrated (≥ 80%).
- All 7 Tier 2 forms migrated OR documented exception in `docs/architecture/useFormDialog.md`.
- Financial flows verified stable (no submission anomalies, no state desync).
- Zero TS/ESLint regressions.
- 1187+/1187+ vitest pass.
- `useFormDialog.ts` unchanged from end of Tier 1.
- `docs/architecture/useFormDialog.md` updated with:
  - Line-items state boundary pattern (Batch 2)
  - Pre-MUTATE validation pattern (Batch 3, Invoice/Quotation)
- `.lovable/plan.md` updated with Tier 2 completion status.
- `mem://patterns/use-form-dialog` updated with line-items + pre-MUTATE notes.

## Constraints
- No API contract changes.
- No DB schema changes.
- No business logic changes (validation rules, posting, calculations untouched).
- All changes confined to presentation + form state layer.
- No new dependencies.

## Out of Scope (Tier 3 / Phase 1C)
- Tier 3 (`AccountFormDialog`, `EmployeeFormDialog`, `StockMovementDialog`, `CashRegisterFormDialog`, `CashTransactionDialog`, `ProductVariantDialog`, `CustomerAddressDialog`) — only if needed to hit ≥80% threshold.
- Phase 1C — Data Orchestration Layer (Repository + Query + Cache + Optimistic consistency).
