# useFormDialog — Form Lifecycle Contract (Phase 1B)

Dialog-bound abstraction for **state + lifecycle only**. UI side-effects (toast, close, navigation) are owner concerns delivered through callbacks.

## When to use

Any dialog-based form (`Dialog`, `ResponsiveDialog`, `FullScreenForm`) that:
- Has a single submit action mapped to a create/update mutation.
- Uses a zod schema for validation.
- Edits a single entity (or creates a new one).

## When NOT to use (documented exceptions)

- **Inline page filters** that don't submit a payload (e.g. table filters) — use plain `useState`/`useForm`.
- **Multi-step wizards with cross-step server validation** when the orchestration logic dominates the lifecycle (e.g. `CustomerFormDialog`, `ProductFormDialog`, `InvoiceFormDialog`). These keep their bespoke flow but adopt `FormDialogFooter` + `FormFieldError` for visual consistency. Migration to `useFormDialog` is allowed once the wizard layer is itself extracted (Phase 1B.2 — future).

## Minimum pattern

```tsx
import { useFormDialog } from "@/hooks/useFormDialog";
import { useMutationToast } from "@/hooks/useMutationToast";
import FormDialogFooter from "@/components/shared/FormDialogFooter";
import FormFieldError from "@/components/shared/FormFieldError";

const toast = useMutationToast({
  successTitle: isEditing ? "تم التحديث" : "تم الإضافة",
});

const { form, isEditing, isSubmitting, submit } = useFormDialog({
  schema,
  entity,
  toValues: (e) => (e ? { name: e.name, ... } : { name: "", ... }),
  toPayload: (v) => ({ name: v.name.trim(), ... }),
  mutationFn: (payload, { isEditing }) =>
    isEditing ? repo.update(entity!.id, payload) : repo.create(payload),
  onSuccess: () => { toast.onSuccess(); onOpenChange(false); },
  onError: toast.onError,
});

return (
  <form onSubmit={submit}>
    <Input {...form.register("name")} />
    <FormFieldError error={form.formState.errors.name} />
    <FormDialogFooter
      isEditing={isEditing}
      isSubmitting={isSubmitting}
      onCancel={() => onOpenChange(false)}
    />
  </form>
);
```

## Architectural rules (enforced at review)

1. **No UI side-effects inside the hook.** Toasts and dialog close happen in callbacks.
2. **No `useEffect(reset)` in consumers.** The hook re-syncs values when `entity` changes.
3. **No manual `try/catch` around mutation in consumers.** Errors flow through `onError`.
4. **Validation only via zod schema** in `src/lib/validations.ts` (or a local schema if domain-specific).
5. **Toasts only via `useMutationToast`** (sonner under the hood).
6. **44px touch targets** on footer buttons (handled by `FormDialogFooter`).
7. **Lifecycle is deterministic:** `INIT → VALIDATE → SUBMIT → MUTATE → RESULT → RESET/CLOSE`. No branching without a documented exception in this file.

## Definition of Done per form

- [ ] No `useEffect(reset)` left in the file.
- [ ] No `useToast`/`toast(...)` calls in the file (use `useMutationToast`).
- [ ] No duplicated `try/catch` around mutation.
- [ ] Footer uses `FormDialogFooter`.
- [ ] All inline field errors render via `FormFieldError` (or `FormMessage` for shadcn `Form`).
- [ ] Zero TS/ESLint regressions.
- [ ] Vitest still green.

## Migrated forms (Tier 1)

- `CategoryFormDialog`
- `WarehouseFormDialog`
- `SupplierFormDialog`
- `ExpenseCategoryFormDialog`

## Pending (Tier 1 partial — wizard layer)

- `CustomerFormDialog` — wizard + draft + permission + duplicate check
- `ProductFormDialog` — wizard + draft

Both adopt `FormDialogFooter`/`FormFieldError` patterns where possible without disrupting the wizard.

## Pending (Tier 2 — Financial)

`ExpenseFormDialog`, `PaymentFormDialog`, `InvoiceFormDialog`, `QuotationFormDialog`, `PurchaseOrderFormDialog`, `SalesOrderFormDialog`.

## Pending (Tier 3 — Misc)

`JournalFormDialog`, `AccountFormDialog`, `EmployeeFormDialog`, `StockMovementDialog`, `CashRegisterFormDialog`, `CashTransactionDialog`, `ProductVariantDialog`, `CustomerAddressDialog`.
