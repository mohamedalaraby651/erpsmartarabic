# خارطة الطريق

## ✅ Phase 1A — UI States Pattern (مكتمل)

- `useListState` hook + `ListStateRenderer` + `ListErrorState` + `EmptyState` معتمدة كنمط رسمي.
- صفحات مغطاة: Categories, ExpenseCategories, Approvals, Tasks, Inventory (Warehouses/Movements tabs)، إضافة إلى الصفحات السابقة (Quotes, SalesOrders, CreditNotes, Expenses, Products, PurchaseOrders, SupplierPayments, CashRegisterDetails…).
- توثيق: `docs/architecture/useListState.md` — متى يُستخدم، الاستثناءات، Definition of Done، Regression checklist.
- الاستثناءات الموثقة: قسم التذكيرات داخل `CustomerDetailsPage`، widgets لوحة التحكم (`WidgetErrorBoundary`)، خلاصة الإشعارات (realtime stream).
- ESLint نظيف على ملفات النمط، Vitest 1187/1187 ✅.

## ⏭ Phase 1B — Forms Pattern (التالي)

توحيد إدارة النماذج بنفس مستوى التوحيد الذي تحقق في القوائم:

- `useFormState` موحّد لإدارة: قيم، أخطاء، حالة إرسال، حالة نجاح/فشل، dirty/touched.
- توحيد عرض أخطاء التحقق (zod) ورسائل الإرسال (toasts vs inline).
- تطبيق على: CustomerForm, SupplierForm, ProductForm, InvoiceForm, QuoteForm, ExpenseForm, JournalEntryForm, EmployeeForm.
- توثيق: `docs/architecture/useFormState.md`.

## Phase 2 — Security & DB Hardening

- `security--run_security_scan` + `supabase--linter` + معالجة الاكتشافات.
- مراجعة RLS و GRANT لجداول logistics/accounting/credit-notes-reverse.
- `supabase--slow_queries` وإضافة فهارس عند الحاجة.

## Phase 3 — Performance Audit

- مراجعة `useMemo` / `useCallback` على صفحات القوائم الكبيرة.
- التحقق من استقرار المراجع (stable refs) داخل JSX.
- قياس re-renders عبر React Profiler.

## معايير الإنجاز للمراحل القادمة

- صفر أخطاء TS/ESLint.
- 1187+/1187+ اختبار يمر.
- صفر اكتشافات أمنية بمستوى error.
- توثيق معماري لكل نمط جديد.
