

# تقرير التدقيق الشامل — نظام ERP إنتاجي

---

## 1. ثغرات أمنية (Security)

### 1.1 حذف السجلات بدون تحقق صلاحيات — Critical
**السبب الجذري**: 14 صفحة تنفذ `supabase.from(table).delete()` مباشرة بدون استدعاء `verifyPermissionOnServer` قبل الحذف.

**الملفات المتأثرة**: `PaymentsPage`, `InvoicesPage`, `SuppliersPage`, `ProductsPage`, `EmployeesPage`, `QuotationsPage`, `SalesOrdersPage`, `PurchaseOrdersPage`, `CategoriesPage`, `InventoryPage` (warehouses).

**الأثر**: أي مستخدم لديه session صالحة يستطيع حذف فواتير ومدفوعات ومنتجات — حتى لو كان دوره `sales` بدون صلاحية delete. الحماية الوحيدة هي RLS، لكن إذا كانت سياسة الحذف تعتمد على `has_any_role` (وليس `check_section_permission`) فالثغرة مفتوحة.

**التأثير الحقيقي**: حذف دفعات مالية يؤدي لفقدان بيانات لا يمكن استردادها + خلل في الأرصدة.

**الإصلاح**: إضافة `await verifyPermissionOnServer(section, 'delete')` قبل كل `delete()` mutation — نفس النمط المستخدم في `CustomerFormDialog` و `SalesOrderFormDialog`.

---

### 1.2 حذف الدفعات لا يعكس الرصيد — Critical
**الملف**: `PaymentsPage.tsx` سطر 79-83

**المشكلة**: عند حذف دفعة، يُحذف السجل من `payments` لكن **لا يُعاد تحديث** `paid_amount` في الفاتورة ولا `current_balance` للعميل. النتيجة: الأرصدة المالية تصبح غير متسقة بشكل دائم.

**الإصلاح**: يجب أن يمر الحذف عبر Edge Function (مثل `process-payment` لكن بوضع reverse) أو trigger في قاعدة البيانات يعيد حساب الأرصدة عند DELETE.

---

### 1.3 حذف الفواتير لا يعكس cached stats — High
**الملف**: `InvoicesPage.tsx` سطر 184-188

عند حذف فاتورة، يُحذف `invoice_items` ثم `invoices`، لكن trigger `update_customer_cached_stats` قد لا يعمل بشكل صحيح لأن الـ customer_id غير متوفر بعد الحذف. النتيجة: `total_purchases_cached` و `invoice_count_cached` في جدول customers تصبح قديمة.

---

### 1.4 switchTenant عملية غير ذرية — High
**الملف**: `tenantContext.ts` سطر 110-147

**المشكلة**: تبديل المستأجر يتم عبر عمليتين منفصلتين:
1. `UPDATE user_tenants SET is_default = false` (كل السجلات)
2. `UPDATE user_tenants SET is_default = true` (السجل الجديد)

إذا فشلت العملية الثانية، يصبح المستخدم **بدون مستأجر افتراضي** — وكل استعلامات `get_current_tenant()` ترجع `null`، مما يعني **عدم إمكانية الوصول لأي بيانات**.

**الإصلاح**: نقل المنطق لـ SQL function واحدة أو Edge Function تنفذ كلتا العمليتين في transaction واحد.

---

## 2. سلامة البيانات المالية (Financial Integrity)

### 2.1 SupplierPaymentDialog — race condition على الرصيد — High
**الملف**: `SupplierPaymentDialog.tsx` سطر 71-92

الكود يجلب `current_balance`، يحسب الرصيد الجديد، ثم يحدّث. إذا قام مستخدمان بتسجيل دفعات لنفس المورد في نفس الوقت، أحد التحديثات يُلغي الآخر (lost update).

**الإصلاح**: استخدام `UPDATE suppliers SET current_balance = current_balance - $amount` بدلاً من قراءة-حساب-كتابة. أو نقل العملية لـ Edge Function مع transaction.

---

### 2.2 payment_number يُولّد من `Math.random()` — Medium
**الملف**: `PaymentFormDialog.tsx` سطر 116-121

`generatePaymentNumber` يستخدم `Math.floor(Math.random() * 1000)` — احتمال التكرار عالي في بيئة إنتاج (1/1000 لكل دفعة في نفس الشهر). لا يوجد UNIQUE constraint في قاعدة البيانات على `payment_number`.

**الإصلاح**: استخدام sequence في قاعدة البيانات (مثل `cash_txn_seq`) أو UUID مختصر.

---

## 3. معمارية وبنية الكود (Architecture)

### 3.1 Service Layer غير مكتمل — High
**الحالة**: يوجد فقط `customerService.ts`. لا يوجد service layer لـ:
- Invoices (إنشاء/حذف/اعتماد)
- Payments (مع عكس الأرصدة)
- Suppliers (دفعات + أرصدة)
- Inventory (حركات المخزون)

**الأثر**: منطق الأعمال مبعثر في 18+ صفحة ومكون. كل صفحة تنفذ `supabase.from().delete()` بطريقتها الخاصة بدون مركزية.

**الإصلاح**: إنشاء `invoiceService.ts`, `paymentService.ts`, `supplierService.ts` تغلف العمليات الحرجة مع التحقق من الصلاحيات.

---

### 3.2 Dashboard.tsx مسؤول عن أكثر من اللازم — Medium
575 سطر — يجمع بين: data fetching, widget rendering, chart config, quick actions, greeting logic, trend calculations. كل هذا في ملف واحد.

---

## 4. أداء (Performance)

### 4.1 استعلامات متكررة لنفس البيانات — Medium
**المشكلة**: 3 hooks مختلفة تجلب `products` + `product_stock` بشكل منفصل:
- `useBusinessInsights` → `['insights-low-stock']`
- `useReportsData` → `['low-stock']`
- `LowStockWidget` (dashboard widget)

كل واحد ينشئ `Map<string, number>` لحساب المخزون. الـ query keys مختلفة فلا يوجد cache sharing.

**الإصلاح**: توحيد في hook مشترك `useLowStockProducts` بـ queryKey واحد.

---

### 4.2 monthly sales chart يجلب كل بيانات الفواتير — Medium
**الملف**: `Dashboard.tsx` سطر 137-161

يجلب كل الفواتير لآخر 6 أشهر (`select('total_amount, created_at')`) ثم يفلتر ويجمع client-side. مع نمو البيانات (10K+ فاتورة)، هذا الاستعلام سيصبح بطيئاً.

**الإصلاح**: استخدام GROUP BY في SQL أو RPC function.

---

## 5. UX وتجربة المستخدم

### 5.1 Insights بدون Deep Links — Medium
**الملف**: `useBusinessInsights.ts`

كل insight يوجه لصفحة عامة (`/customers`, `/products`) بدون filter. المستخدم يصل لقائمة كاملة ولا يعرف أي عملاء تجاوزوا حد الائتمان.

**الإصلاح**: إضافة query params لـ href (مثل `/customers?filter=credit_exceeded`).

---

### 5.2 لا يوجد confirmation dialog قبل الحذف — Medium
أغلب صفحات الحذف تنفذ `deleteMutation.mutate(id)` مباشرة بدون تأكيد. حذف فاتورة بضغطة زر واحدة.

---

## 6. Type Safety

### 6.1 `as any` في 14 ملف (107 استخدام) — Medium
أبرز الملفات: `UsersPage.tsx` (6 استخدامات لقراءة profiles/roles), `SuppliersPage.tsx`, `SearchPage.tsx`, `BackupPage.tsx`.

---

## 7. Business Intelligence

### 7.1 لا يوجد Supplier Intelligence — Low
النظام يحتوي على `useCustomerAlerts` لكن لا يوجد مكافئ للموردين: لا تنبيه عند تأخر توريد، لا تحليل أداء الموردين.

---

## أعلى 10 إصلاحات بحسب ROI

```text
#   الإصلاح                                        الجهد    الأثر     ROI
─── ──────────────────────────────────────────── ────── ─────── ────
1   إضافة verifyPermission قبل كل delete          2h     Critical  ★★★★★
2   عكس الأرصدة عند حذف دفعات                     3h     Critical  ★★★★★
3   جعل switchTenant ذرياً (SQL function)          1h     High      ★★★★★
4   إصلاح race condition في SupplierPayment       1h     High      ★★★★★
5   payment_number بـ sequence بدل random           1h     Medium    ★★★★
6   توحيد low-stock query في hook مشترك           1h     Medium    ★★★★
7   إنشاء invoiceService + paymentService          4h     High      ★★★★
8   إضافة confirmation dialog قبل الحذف            2h     Medium    ★★★
9   تحويل monthly chart لـ GROUP BY query          1h     Medium    ★★★
10  Deep links في Business Insights               1h     Medium    ★★★
```

## أعلى 3 مخاطر تكسر النظام في الإنتاج

1. **حذف دفعة يفسد الأرصدة المالية بشكل صامت** — لا يوجد آلية لعكس الأثر المالي، والمستخدم لن يلاحظ الخلل حتى يظهر في التقارير. هذا الأخطر لأنه يتراكم.

2. **switchTenant غير ذري** — فشل جزئي يجعل المستخدم بدون مستأجر = لا يستطيع رؤية أي بيانات ولا يعرف السبب.

3. **حذف بدون صلاحيات** — موظف مبيعات يستطيع حذف فواتير ومدفوعات وموردين بدون أي تحقق — الحماية تعتمد فقط على RLS التي قد تكون permissive.

