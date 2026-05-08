# خطة إنتاجية متكاملة على 5 مراحل (آمنة، تدريجية، قابلة للاختبار)

## نظرة عامة على الحالة الراهنة
- تم سابقاً: تحويل 7 dialogs صغيرة إلى `ResponsiveDialog`، تفعيل `noImplicitAny`، إضافة CSP، حماية console.log في الإنتاج، توحيد `getSafeErrorMessage` في hooks اللوجستيات/المبيعات.
- المتبقي الفعلي: 4 dialogs كبيرة + RestoreBackupDialog، 12 موضع `as any` في hooks، 3 مواضع `err.message` في RestoreBackupDialog، 16 صفحة قائمة بدون pull-to-refresh.

---

## المرحلة 1 — توحيد Dialogs الكبيرة إلى ResponsiveDialog

**الملفات المستهدفة (5):**
- `src/components/invoices/InvoiceFormDialog.tsx`
- `src/components/quotations/QuotationFormDialog.tsx`
- `src/components/quotes/*FormDialog.tsx` (إن وُجد)
- `src/components/credit-notes/CreditNoteFormDialog.tsx`
- `src/components/customers/dialogs/CustomerReminderDialog.tsx` (تأكيد)

**الإجراء لكل ملف:**
1. استبدال imports من `@/components/ui/dialog` بـ `@/components/ui/responsive-dialog`.
2. إعادة تسمية: `Dialog` → `ResponsiveDialog`، `DialogContent` → `ResponsiveDialogContent`، إلخ.
3. التأكد من أن أزرار "حفظ / إصدار / إرسال" في `Footer` تظهر sticky بأسفل الـ Drawer على الموبايل.
4. **ترك** `InvoiceApprovalDialog` و `BulkPrintConfirmDialog` و `DuplicateDetectionDialog` كـ Dialogs عادية (صغيرة، لا تحتاج Drawer).

**اختبار:**
- فتح كل نموذج على viewport 390px والتحقق من ظهوره كـ Drawer من الأسفل.
- التحقق من ظهوره كـ Dialog مركزي على viewport 1280px.
- تجربة دورة كاملة: إنشاء فاتورة، إنشاء عرض سعر، إنشاء credit note.

---

## المرحلة 2 — توحيد رسائل الخطأ الآمنة

**RestoreBackupDialog (3 مواضع):**
- استبدال `err instanceof Error ? err.message : 'fallback'` بـ `getSafeErrorMessage(err) || 'fallback'` في الأسطر 246, 379, 449.
- إبقاء `console.error` للتشخيص الداخلي.

**فحص شامل:**
- مسح `rg "\.message" src/hooks src/components` للعثور على أي تسريب آخر.
- استبدال أي `e.message` يُعرض في `toast.error()` بـ `getSafeErrorMessage(e)`.

**اختبار:**
- محاكاة خطأ DB (مثل insert duplicate) والتأكد أن الرسالة عربية مفهومة وليست SQL خام.

---

## المرحلة 3 — تنظيف TypeScript تدريجي

**استخراج Models موحدة:**
- إنشاء `src/types/entities.ts` مع `export type Customer = Database['public']['Tables']['customers']['Row']` لكل من: Customer, Supplier, Invoice, Quote, GoodsReceipt, PurchaseInvoice, DeliveryNote, Reminder.

**إزالة `(supabase as any)` (12 موضعاً):**
- تنفيذ هذا فقط بعد التحقق من أن types الجداول موجودة في `types.ts` (تم التحقق سابقاً من وجود quotes/quote_items/purchase_invoices/goods_receipts/delivery_notes).
- في كل hook: إزالة `(supabase as any)` واستبدالها بـ `supabase` مباشرة، مع cast الـ payload فقط عند الحاجة.
- ملفات: `useQuotes.ts`, `usePurchaseInvoices.ts`, `useGoodsReceipts.ts`, `useDeliveryNotes.ts`.

**`noImplicitAny`:** مفعّل بالفعل وbuild نظيف. **`strictNullChecks` يبقى معطّلاً** — لكن سنضيف فحوص null دفاعية في 3-5 أماكن حساسة (تحويلات مالية، بيانات user).

**اختبار:** `bunx tsc --noEmit` يجب أن يبقى نظيفاً.

---

## المرحلة 4 — مراجعة CSP والتوثيق الأمني

**CSP موجود.** المطلوب:
- اختبار الموقع على المعاينة وتجميع أي console errors تتعلق بـ CSP violations.
- ضبط السياسة بناءً على ما يظهر فعلاً (إضافة domains مفقودة، أو إزالة سماحات زائدة).
- اعتبار حذف `'unsafe-eval'` لو لم يكسر شيئاً.

**توثيق:**
- التحقق من أن `docs/SYSTEM_AUDIT_2026_05.md` يحتوي على القسم الخاص بـ:
  - لماذا anon key ليس تسريباً.
  - شرح RLS كخط الدفاع الفعلي.
  - الـ 58 false positives الموثّقة.
- (تم سابقاً — فقط مراجعة وتأكيد).

---

## المرحلة 5 — صقل تجربة الموبايل

**Pull-to-refresh:**
- معظم الصفحات تستخدم بالفعل مكون `PullToRefresh` الموجود. الجديد `usePullToRefresh` hook متوفر للاستخدام في بقية الصفحات.
- تركيب `usePullToRefresh` في الصفحات التي لا تملك أي pull-to-refresh: `TasksPage`, `NotificationsPage`, `ExpensesPage` (تحقق ميداني أولاً).

**توحيد حالات UI:**
- التأكد من وجود مكونات موحدة: `EmptyState`, `LoadingSkeleton`, `ErrorState`.
- إنشاء/استخدام `<ListErrorState message={getSafeErrorMessage(error)} onRetry={refetch} />` كنمط موحد.

**RTL وتنسيق العملة:**
- مسح سريع لاستخدام `toLocaleString('ar-EG')` للأرقام و `Intl.NumberFormat('ar-EG', { style: 'currency', currency: 'EGP' })` للعملة.
- لا تغيير في حسابات — فقط في طبقة العرض.

---

## قواعد التنفيذ الصارمة

| القاعدة | السلوك |
|---------|---------|
| منطق تجاري | لا يُمسّ مطلقاً — فقط طبقة العرض ومعالجة الأخطاء. |
| الملفات الكبيرة | لا تقسيم في هذه الجلسة — يحتاج جلسة مخصصة منفصلة. |
| بعد كل مرحلة | `bunx tsc --noEmit` + فحص runtime errors + console logs. |
| التراجع | كل مرحلة مستقلة — لو فشلت 3 نتراجع عنها فقط. |

## معايير النجاح
- ✅ كل النماذج الكبيرة تعمل كـ Drawer على الموبايل و Dialog على الديسكتوب.
- ✅ 0 رسائل خطأ خام للمستخدم النهائي.
- ✅ 0 `(supabase as any)` في hooks اللوجستيات/المبيعات.
- ✅ ملف `src/types/entities.ts` موحَّد للكيانات الأساسية.
- ✅ TypeScript build نظيف.
- ✅ CSP فعّال بدون كسر موارد.
- ✅ pull-to-refresh متوفر في الصفحات الرئيسية.

## الملفات المتأثرة (تقدير)
- **جديد**: `src/types/entities.ts`
- **تعديل**: 5 dialogs كبيرة، RestoreBackupDialog، 4 hooks (logistics/sales-cycle)، 2-3 صفحات قوائم، docs/SYSTEM_AUDIT_2026_05.md
- **بدون مساس**: `.env`, `client.ts`, `types.ts`, ملفات منطق الحسابات المالية.
