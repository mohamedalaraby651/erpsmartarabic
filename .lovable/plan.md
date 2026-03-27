

# خطة التنفيذ الشاملة - إعادة هيكلة وتقوية وحدة العملاء

بناءً على المراجعة الإستراتيجية المقدمة، تم تصحيح الافتراضات وإعادة ترتيب الأولويات حسب Business Impact / Engineering Cost.

---

## Sprint 1: إصلاحات حرجة (Critical Fixes)

### 1.1 إصلاح Double Query Pattern
**الملف:** `src/pages/customers/CustomersPage.tsx`
- **المشكلة:** سطر 89-124 يستدعي `useCustomerQueries` مرتين (مرة بـ pagination placeholder ومرة بـ pagination حقيقي)
- **الحل:** حذف الاستدعاء الأول (سطر 89-103) + `useServerPagination` الأول (سطر 90)، واستخدام `queriesWithPagination` فقط مع تمرير `totalCount` ديناميكياً
- **ملاحظة:** دمج count query مع data query عبر `select('*', { count: 'exact' })` في `useCustomerQueries.ts` بدلاً من query منفصل — مع الاحتفاظ بخيار الفصل للـ datasets الكبيرة (>100K) مستقبلاً

### 1.2 إضافة Delete Confirmation Dialog
**الملف:** `src/pages/customers/CustomersPage.tsx`
- **المشكلة:** `handleDelete` (سطر 140-143) ينفذ الحذف مباشرة بدون تأكيد
- **الحل:** إضافة `AlertDialog` للحذف الفردي مع `deleteConfirmId` state، مشابه لـ `bulkDeleteOpen` الموجود

### 1.3 إصلاح Filter Drawer URL Sync
**الملف:** `src/hooks/customers/useCustomerFilters.ts`
- **المشكلة:** `applyDrawerFilters` (سطر 70-75) يحدّث الـ state فقط بدون استدعاء `syncToUrl`
- **الحل:** إضافة `syncToUrl({ type: tempType, vip: tempVip, gov: tempGovernorate, status: tempStatus })` بعد تحديث الـ state

### 1.4 إصلاح `any` types
**الملف:** `src/components/customers/CustomerHeroHeader.tsx`
- **المشكلة:** سطر 19-21 يستخدم `any[]` مع `eslint-disable`
- **الحل:** استبدال بـ `Database['public']['Tables']['invoices']['Row'][]` و `Database['public']['Tables']['payments']['Row'][]`

### 1.5 إزالة `tabGroups` المكرر
**الملف:** `src/pages/customers/CustomerDetailsPage.tsx`
- **المشكلة:** `tabGroups` معرّف في سطر 39-52 وأيضاً في `customerConstants.ts:53-91`
- **الحل:** حذف التعريف المحلي واستيراده من `customerConstants.ts`

### 1.6 Server-Side Permission Check للحذف
**الملفات:** `src/pages/customers/CustomersPage.tsx` + `src/hooks/customers/useCustomerQueries.ts`
- **المشكلة:** الحذف يعتمد على `canDelete = userRole === 'admin'` client-side فقط
- **الحل:** إضافة `verifyPermissionOnServer('customers', 'delete')` في `deleteMutation.mutationFn` قبل تنفيذ الحذف

---

## Sprint 2: تحسين الأداء وسلامة البيانات

### 2.1 Database Indexes
**Migration جديد:**
```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX idx_customers_name_trgm ON customers USING gin(name gin_trgm_ops);
CREATE INDEX idx_customers_phone ON customers(phone);
CREATE INDEX idx_customers_tenant_active ON customers(tenant_id, is_active);
CREATE INDEX idx_customers_type_vip ON customers(customer_type, vip_level);
CREATE INDEX idx_invoices_customer_status ON invoices(customer_id, payment_status);
```

### 2.2 دمج Count + Data Query
**الملف:** `src/hooks/customers/useCustomerQueries.ts`
- حذف count query المنفصل (سطر 27-41) ودمجه مع data query عبر `select('*', { count: 'exact' })`
- إرجاع `{ customers, totalCount }` من query واحد

### 2.3 إصلاح DSO الحقيقي
**الملف:** `src/hooks/customers/useCustomerDetail.ts`
- **المشكلة:** سطر 124-133 يحسب DSO من `due_date - created_at` (تاريخ الاستحقاق وليس السداد)
- **الحل:** ربط الفواتير بالمدفوعات — حساب DSO = متوسط (تاريخ آخر دفعة - تاريخ إنشاء الفاتورة) للفواتير المدفوعة

### 2.4 Duplicate Detection (pg_trgm)
**Migration جديد:** إنشاء RPC `find_duplicate_customers` يستخدم `similarity()` للبحث عن أسماء متشابهة أو أرقام هواتف مطابقة
**مكون جديد:** `src/components/customers/DuplicateDetectionDialog.tsx` — زر في صفحة القائمة يعرض المرشحين للدمج مع نسبة التشابه

### 2.5 Cached Stats via Trigger
**Migration جديد:** إضافة `total_purchases_cached`, `invoice_count_cached`, `last_activity_at` إلى جدول `customers` + trigger يحدّثها عند كل فاتورة/دفعة جديدة

---

## Sprint 3: إعادة هيكلة المعمارية

### 3.1 دمج Hooks في Unified Module Pattern
**الملف الجديد:** تعديل `src/hooks/customers/useCustomerQueries.ts` ليكون الـ hook الموحد الذي يدير:
- Data fetching (مع count مدمج)
- Mutations (delete, bulk operations) مع server-side permission check
- Prefetch logic

**إزالة:** الاستدعاء المزدوج في `CustomersPage.tsx`

### 3.2 إضافة Domain Service Layer
**ملف جديد:** `src/lib/services/customerService.ts`
- يحتوي على business logic موحد:
  - `validateBeforeDelete(customerId)` — يتحقق من عدم وجود فواتير مفتوحة
  - `canModifyCustomer(userId, customerId)` — server permission check
  - `calculateCustomerHealth(invoices, payments)` — DSO, CLV, paymentRatio
- الـ hooks تستدعي هذا الـ service بدلاً من احتواء المنطق مباشرة

### 3.3 Audit Trail للعمليات الجماعية
**الملف:** `src/hooks/customers/useCustomerQueries.ts`
- إضافة logging لـ bulk operations عبر `supabase.rpc('log_bulk_operation', ...)` أو trigger على مستوى DB

---

## Sprint 4: تحسينات UX

### 4.1 Delete with Undo (Toast-based)
**الملف:** `src/hooks/customers/useCustomerQueries.ts`
- بدلاً من حذف فوري → optimistic hide + toast مع زر "تراجع" لمدة 5 ثوانٍ
- تنفيذ الحذف الفعلي بعد انتهاء المهلة

### 4.2 Enhanced Empty State
**الملف:** `src/pages/customers/CustomersPage.tsx` سطر 320
- استبدال النص البسيط بـ `EmptyState` component مع illustration + CTAs (إضافة عميل، استيراد من Excel)

### 4.3 Grid Skeleton
**مكون جديد:** `src/components/customers/CustomerGridSkeleton.tsx`
- عرض بطاقات وهمية بنفس هيكل `CustomerGridCard` بدلاً من `TableSkeleton` في وضع Grid

### 4.4 Keyboard