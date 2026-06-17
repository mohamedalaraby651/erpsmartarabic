## Phase 1B — Forms Layer Standardization (Controlled Rollout)

### تعديلات بعد المراجعة
- `useFormDialog` يصبح **constrained + callback-driven** (لا toast/close داخلي).
- تنفيذ **Gate-driven** بثلاث مراحل، توقف إلزامي بعد Tier 1.

---

### المرحلة 0 — Foundation Layer

**`src/hooks/useFormDialog.ts`** — Dialog-bound abstraction، state + lifecycle فقط، صفر UI side-effects:

```ts
useFormDialog<TValues, TEntity>({
  schema: ZodSchema<TValues>,
  entity: TEntity | null,
  toValues: (e: TEntity | null) => TValues,
  toPayload: (v: TValues) => unknown,
  mutationFn: (payload: unknown, ctx: { isEditing: boolean }) => Promise<void>,
  onSuccess?: (ctx: { isEditing: boolean }) => void,
  onError?: (error: unknown) => void,
  onSettled?: () => void,
})
// returns: { form, isEditing, isSubmitting, submit, reset }
```

قواعد صارمة داخل الـ hook:
- لا `toast`، لا `onOpenChange`، لا navigation.
- يعالج reset التلقائي عند تغيّر `entity` (يستبدل `useEffect(reset)`).
- يلتزم بـ lifecycle deterministic: `INIT → VALIDATE → SUBMIT → MUTATE → RESULT → RESET/CLOSE` (الـ CLOSE يحدث في callback خارجي).
- generics كاملة، صفر `any`.

**`src/components/shared/FormDialogFooter.tsx`** — إلغاء + حفظ موحّد (نص ديناميكي، disabled state موحّد، 44px).

**`src/components/shared/FormFieldError.tsx`** — عرض موحّد لرسائل zod.

**نمط الاستهلاك الموحّد في كل form:**
```ts
const toast = useMutationToast({ successTitle: '...' });
const { form, isEditing, isSubmitting, submit } = useFormDialog({
  schema, entity, toValues, toPayload,
  mutationFn: (payload, { isEditing }) => isEditing ? update(...) : create(...),
  onSuccess: () => { toast.onSuccess(); onOpenChange(false); },
  onError: toast.onError,
});
```

---

### المرحلة 1 — POC (Tier 1) — توقف إلزامي بعدها

ترحيل 5 نماذج فقط:
- `CategoryFormDialog`
- `WarehouseFormDialog`
- `CustomerFormDialog`
- `SupplierFormDialog`
- `ProductFormDialog`

**Gate قبل الانتقال لـ Tier 2:**
- صفر regressions في submit/dialog lifecycle/validation.
- صفر `useEffect(reset)` متبقّية في الملفات المعدّلة.
- صفر manual toast handling أو duplicate `try/catch`.
- TypeScript نظيف، ESLint نظيف.
- 1187+/1187+ vitest pass.
- مراجعة معمارية: العقد فعلاً constrained (لا تسرّب UI داخل الـ hook).

---

### المرحلة 2 — Financial Layer (بعد اجتياز Gate 1)
`ExpenseFormDialog`, `ExpenseCategoryFormDialog`, `PaymentFormDialog`, `InvoiceFormDialog`, `QuotationFormDialog`, `PurchaseOrderFormDialog`, `SalesOrderFormDialog`.

استثناء موثّق: `InvoiceFormDialog`/`QuotationFormDialog` يحتفظان بطبقة `InvoiceValidation` (server-side) **داخل** الـ lifecycle الموحّد (قبل MUTATE)، لا خارجه.

---

### المرحلة 3 — Misc Layer (أخيراً)
`JournalFormDialog`, `AccountFormDialog`, `EmployeeFormDialog`, `StockMovementDialog`, `CashRegisterFormDialog`, `CashTransactionDialog`, `ProductVariantDialog`, `CustomerAddressDialog`.

---

### Definition of Done (مع إضافات المراجعة)
- ≥ 80% (≥17/21) migrated.
- **A. Architectural Consistency:** صفر `useEffect(reset)`، صفر manual toast، صفر duplicate submit try/catch في الملفات الميغريتد.
- **B. Lifecycle Determinism:** كل النماذج تتبع `INIT → VALIDATE → SUBMIT → MUTATE → RESULT → RESET/CLOSE` بدون branching غير موثق.
- Validation centralized في `validations.ts` (zod).
- Toast عبر `useMutationToast` فقط.
- صفر TS/ESLint regressions.
- 1187+/1187+ vitest pass.
- توثيق: `docs/architecture/useFormDialog.md` + `mem://patterns/use-form-dialog` + تحديث `mem://index.md` و`.lovable/plan.md`.

---

### قيود صارمة
- لا تعديل API contracts / DB schema / business logic.
- لا dependencies جديدة.
- كل التغييرات في presentation/state layer فقط.

### الخطوات التنفيذية الفورية بعد الموافقة
1. إنشاء `useFormDialog` (constrained + callbacks) + `FormDialogFooter` + `FormFieldError` + التوثيق.
2. ترحيل Tier 1 (5 نماذج).
3. **توقف** للمراجعة + تشغيل vitest + lint قبل Tier 2.
