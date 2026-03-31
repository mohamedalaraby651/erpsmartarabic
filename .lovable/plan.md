

# خطة التحسينات المتبقية — وحدة العملاء (الجولة 3)

## المشاكل المكتشفة

### 1. خطأ متبقي في `process-payment` Edge Function
- **سطر 208**: `const newBalance = (customer.current_balance || 0) - paymentData.amount;` — هذا السطر يحسب الرصيد الجديد من القيمة القديمة (stale) بدلاً من الاعتماد على نتيجة الـ RPC الذري. يُستخدم في الـ response (سطر 239) ويُعطي رقم غير دقيق للعميل.
- **الإصلاح**: حذف هذا السطر وإرجاع الرصيد الحقيقي عبر query بعد التحديث.

### 2. إجمالي المدفوعات غير ظاهر في Mobile Stats
- شريط الإحصاءات على الموبايل يعرض: الرصيد، الفواتير، نسبة السداد، المشتريات، المستحق — لكن **لا يعرض إجمالي المدفوعات** كرقم مستقل.
- **الإصلاح**: إضافة "إجمالي المدفوعات" إلى `mobileStats`.

### 3. تبويب إشعارات دائنة — بدون ملخص مالي
- تبويب Credit Notes يعرض القائمة فقط بدون شريط ملخص (إجمالي المرتجعات، العدد).
- **الإصلاح**: إضافة شريط ملخص مثل تبويبي الفواتير والمدفوعات.

### 4. `CustomerFinancialSummary` — ينقصه "إجمالي المدفوعات" في StatsGrid
- StatsGrid يعرض 8 بطاقات لكن لا يوجد بطاقة "إجمالي المدفوعات" كرقم مستقل. المستخدم يرى المشتريات والمستحق لكن لا يرى المدفوعات إلا كنسبة.
- **الإصلاح**: استبدال بطاقة "متوسط الفاتورة" (أقل أهمية) ببطاقة **"إجمالي المدفوعات"** أو إضافتها كبطاقة تاسعة.

### 5. `process-payment` — الرصيد يتأثر مرتين
- الـ trigger `trg_update_customer_balance_on_invoice` لا يتداخل مع الدفع (يعمل على invoices فقط) — لكن `reverse_payment_on_delete` trigger + `atomic_customer_balance_update` RPC كلاهما يعمل على المدفوعات. عند الدفع:
  1. `process-payment` يستدعي `atomic_customer_balance_update` → ينقص الرصيد
  2. لا يوجد trigger على INSERT في payments يزيد الرصيد — OK
- عند حذف الدفعة: `reverse_payment_on_delete` يزيد الرصيد — OK
- **لا يوجد تعارض هنا** — التدفق سليم.

---

## خطة التنفيذ

### 1. إصلاح `process-payment/index.ts` — إزالة newBalance المتقادم
- حذف السطر 208 (`const newBalance = ...`)
- بعد استدعاء `atomic_customer_balance_update` بنجاح: query الرصيد الحقيقي من DB
- تحديث الـ response ليعكس الرصيد الفعلي

### 2. تحسين StatsGrid — إضافة بطاقة "إجمالي المدفوعات"
- إضافة prop `totalPayments` إلى `CustomerStatsGrid`
- إضافة بطاقة جديدة بأيقونة خضراء تعرض إجمالي المدفوعات
- تمرير القيمة من `CustomerDetailsPage`

### 3. إضافة "إجمالي المدفوعات" إلى Mobile Stats
- إضافة عنصر جديد في مصفوفة `mobileStats`

### 4. تحسين تبويب إشعارات دائنة — شريط ملخص
- إضافة summary bar (إجمالي المرتجعات + العدد) مثل تبويب المدفوعات

---

## الملفات المتأثرة

```text
تعديل (4 ملفات):
  supabase/functions/process-payment/index.ts  — إزالة newBalance المتقادم
  src/components/customers/CustomerStatsGrid.tsx — إضافة بطاقة المدفوعات
  src/pages/customers/CustomerDetailsPage.tsx    — تمرير totalPayments + mobile stats
  src/components/customers/tabs/CustomerTabCreditNotes.tsx — شريط ملخص
```

