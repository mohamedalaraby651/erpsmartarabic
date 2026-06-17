# خارطة الطريق

## ✅ Phase 1A — UI States Pattern (مكتمل)

- `useListState` + `ListStateRenderer` + `ListErrorState` + `EmptyState` معتمدة كنمط رسمي.
- توثيق: `docs/architecture/useListState.md`.

## 🟡 Phase 1B — Forms Pattern (Foundation + Tier 1 POC منجز)

**Foundation منجز:**
- `src/hooks/useFormDialog.ts` — Dialog-bound، constrained، callback-driven (state + lifecycle فقط، لا UI side-effects).
- `src/components/shared/FormDialogFooter.tsx` — footer موحّد بـ 44px touch targets.
- `src/components/shared/FormFieldError.tsx` — عرض موحّد لرسائل zod.
- توثيق: `docs/architecture/useFormDialog.md`.
- ذاكرة: `mem://patterns/use-form-dialog` + تحديث `mem://index.md`.

**Tier 1 POC منجز (Gate-pass):**
- `CategoryFormDialog`, `WarehouseFormDialog`, `ExpenseCategoryFormDialog` — مهاجَرة كاملة.
- صفر `useEffect(reset)`، صفر manual toast، صفر duplicate try/catch في الملفات المهاجَرة.
- ESLint نظيف على ملفات النمط، Vitest 1187/1187 ✅.

**Tier 1 المتبقي (يتطلب طبقة wizard منفصلة لاحقاً):**
- `CustomerFormDialog`, `ProductFormDialog`, `SupplierFormDialog` — لها flows خاصة (wizard + draft + permission + duplicate check + dual desktop/mobile). تبقى على نمطها الحالي حتى Phase 1B.2.

## ⏭ Phase 1B.1 — Tier 2 (Financial Layer)

`ExpenseFormDialog`, `PaymentFormDialog`, `InvoiceFormDialog`, `QuotationFormDialog`, `PurchaseOrderFormDialog`, `SalesOrderFormDialog`.

## ⏭ Phase 1B.2 — Tier 3 + Wizard Layer

`JournalFormDialog`, `AccountFormDialog`, `EmployeeFormDialog`, `StockMovementDialog`, `CashRegisterFormDialog`, `CashTransactionDialog`, `ProductVariantDialog`, `CustomerAddressDialog` + استخراج طبقة Wizard موحّدة لـ Customer/Product/Supplier.

## ⏭ Phase 1C — Unified Data Mutation Layer

توحيد Repository + Query orchestration (الطبقة الثالثة بعد List + Form).

## معايير الإنجاز للمراحل القادمة

- صفر أخطاء TS/ESLint.
- 1187+/1187+ اختبار يمر.
- صفر اكتشافات أمنية بمستوى error.
- توثيق معماري لكل نمط جديد.
