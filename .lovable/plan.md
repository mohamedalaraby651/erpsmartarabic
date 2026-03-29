

# خطة تحسين قسم العملاء — 5 مراحل

---

## المرحلة 1: الأمان وسلامة البيانات (الأساس)

### 1.1 نقل دمج العملاء إلى DB Function ذرية
- **ملف جديد**: Migration SQL — إنشاء `merge_customers_atomic(p_primary_id UUID, p_duplicate_id UUID)` كـ `SECURITY DEFINER` function
- تنقل invoices, payments, sales_orders, quotations, customer_addresses, customer_communications, customer_reminders, attachments في transaction واحدة
- تحذف العميل المكرر وتُحدّث رصيد العميل الأساسي
- **تعديل**: `CustomerMergeDialog.tsx` — استبدال Edge Function call بـ `supabase.rpc('merge_customers_atomic', ...)`
- **حذف**: `supabase/functions/merge-customers/index.ts` (لم يعد مطلوباً)

### 1.2 Batch Validation قبل الحذف الجماعي
- **Migration**: إنشاء `batch_validate_delete(p_ids UUID[])` — ترجع قائمة العملاء الذين لديهم فواتير مفتوحة
- **تعديل**: `useCustomerQueries.ts` — `bulkDeleteMutation` يستدعي الـ RPC أولاً ويعرض خطأ بأسماء العملاء غير القابلين للحذف

### 1.3 إصلاح audit logging
- **تعديل**: `useCustomerQueries.ts` — استبدال `.then(() => {})` بـ `try/await/catch` مع `logErrorSafely`

### 1.4 Sanitize search input
- **تعديل**: `useCustomerQueries.ts` — escape `%` و `_` في `debouncedSearch` قبل `.ilike`
- **تعديل**: `CustomerMergeDialog.tsx` — نفس المعالجة

---

## المرحلة 2: دقة البيانات المالية

### 2.1 إضافة Credit Notes لكشف الحساب
- **تعديل**: `StatementOfAccount.tsx` — إضافة prop `creditNotes` واستخدامها كحركات credit بنوع 'مرتجع'
- **تعديل**: `useCustomerDetail.ts` — إضافة query لجلب `credit_notes` المرتبطة بالعميل
- **تعديل**: `CustomerDetailsPage.tsx` — تمرير `creditNotes` إلى `StatementOfAccount`

### 2.2 إصلاح حساب DSO
- **تعديل**: `customerService.ts` — استخدام `due_date` (إن وُجد) بدلاً من `created_at` في حساب DSO

### 2.3 عرض قائمة الأسعار المرتبطة
- **تعديل**: `CustomerHeroHeader.tsx` — عرض badge باسم price list إن وُجد `price_list_id`

---

## المرحلة 3: الأداء والتحميل الكسول

### 3.1 تقسيم CustomerDetailsPage إلى Tab Components مستقلة
- **ملفات جديدة** (في `src/components/customers/tabs/`):
  - `CustomerTabAddresses.tsx`
  - `CustomerTabInvoices.tsx` (مع pagination داخلية 20/page)
  - `CustomerTabPayments.tsx`
  - `CustomerTabQuotations.tsx`
  - `CustomerTabOrders.tsx`
  - `CustomerTabFinancial.tsx`
  - `CustomerTabStatement.tsx`
  - `CustomerTabAging.tsx`
  - `CustomerTabAnalytics.tsx`
  - `CustomerTabActivity.tsx`
  - `CustomerTabAttachments.tsx`
- **تعديل**: `CustomerDetailsPage.tsx` — تقليصه إلى ~120 سطر orchestrator يستخدم `React.lazy` + `Suspense` لتحميل كل tab

### 3.2 تحسين useCustomerDetail
- **تعديل**: `useCustomerDetail.ts` — 
  - تحميل `invoices` و `payments` فقط عند فتح tab يحتاجها (ليس دائماً)
  - رفع `staleTime` للـ stats إلى 60000+
  - إضافة `placeholderData: keepPreviousData`

### 3.3 Pagination في كشف الحساب
- **تعديل**: `StatementOfAccount.tsx` — إضافة client-side pagination (20 صف/صفحة)

---

## المرحلة 4: تحسينات UX والحماية

### 4.1 تأكيد الإجراءات التدميرية
- **تعديل**: `CustomerDetailsPage.tsx` (tab العناوين) — إضافة `AlertDialog` قبل حذف العنوان بدلاً من الحذف المباشر
- المكونات الفرعية الجديدة ستتضمن التأكيد

### 4.2 تحذير البيانات غير المحفوظة
- **تعديل**: `CustomerFormDialog.tsx` — إضافة `onInteractOutside` مع فحص dirty state + confirmation dialog

### 4.3 تحسين التصدير
- **تعديل**: `CustomersPage.tsx` — إضافة خيار "تصدير الكل" يجلب بدون `.range()` limit

### 4.4 إصلاحات صغيرة
- إضافة `keepPreviousData` في search preview
- عرض "محدد من هذه الصفحة فقط" عند bulk selection
- Mobile: جعل الأقسام منطوية افتراضياً

---

## المرحلة 5: التوسع والتحسينات المتقدمة

### 5.1 DB: إضافة `last_communication_at`
- **Migration**: إضافة عمود cached + trigger يُحدّث عند INSERT في `customer_communications`

### 5.2 فلاتر متقدمة
- فلتر "بدون تواصل منذ X يوم" باستخدام `last_communication_at`
- فلتر "بدون فواتير منذ X يوم" باستخدام `last_activity_at`

### 5.3 DB Index
- **Migration**: `CREATE INDEX idx_invoices_customer_payment ON invoices(customer_id, payment_status)`

---

## ملخص الملفات المتأثرة

```text
جديد:
  - 1 migration (merge_customers_atomic + batch_validate_delete + last_communication_at + index)
  - 11 tab components في src/components/customers/tabs/

تعديل:
  - CustomerDetailsPage.tsx (488→~120 سطر)
  - useCustomerDetail.ts (lazy loading)
  - useCustomerQueries.ts (sanitize + audit fix + batch validate)
  - StatementOfAccount.tsx (credit notes + pagination)
  - CustomerMergeDialog.tsx (RPC بدل Edge Function)
  - customerService.ts (DSO fix)
  - CustomerFormDialog.tsx (unsaved warning)
  - CustomerHeroHeader.tsx (price list badge)
  - CustomersPage.tsx (export all)

حذف:
  - supabase/functions/merge-customers/index.ts
```

## معايير القبول
- Merge ذري 100% على مستوى DB
- لا يمكن حذف عميل لديه فواتير مفتوحة
- كشف الحساب يشمل المرتجعات
- التحميل الأولي ≤ 3 queries
- Tabs تُحمّل فقط عند الفتح
- لا freeze مع 1000+ فاتورة
- جميع الإجراءات التدميرية تتطلب تأكيد

